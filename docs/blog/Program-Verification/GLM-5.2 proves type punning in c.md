---
title: GLM-5.2 proves type punning in C
date: 2026-08-10
summary: 展示 GLM-5.2 如何利用 CompCert 证明 C 语言中的类型双关。
tags:
    - program verification
---

# GLM-5.2 proves type punning in C

Musl 的数学库中有这样一个函数 `fabs` 用于求浮点数的绝对值：

```c
double fabs(double x) {
    union {double f; uint64_t i;} u = {x};
    u.i &= -1ULL/2;        
    return u.f;
}
```

程序本身很简单：（起码在现在的计算机上普遍满足）C 语言中的 `union` 的各个部分共享同一块内存地址，因此 `u.f` 确实存储了 `double` 类型的值，而 `u.i` 则存储了同一块内存的 `uint64_t` 类型的值。通过对 `u.i` 进行按位与操作，我们可以清除符号位，从而得到绝对值。

但是 Frama-C WP 的内存模型在处理 `union` 时是 unsound 的，它会丢掉 `u.i` 和 `u.f` 之间的关系，而认为 `u.i` 和 `u.f` 是两个独立的变量，从而无法证明 `u.f` 的值确实是 `x` 的绝对值（不过 Frama-C 值分析插件 Eva 倒是可以处理这种情况，不过抽象域不足以推导出“绝对值”这种语义）。

因此，我让 GLM-5.2 尝试主动证明 `fabs` 的正确性。GLM-5.2 利用了 CompCert，将 C 语言前端通过 clightgen 转换为 Clight，然后以 Clight 为基础，证明了 `union {double f; uint64_t i;} u = {x}` 这一步的正确性，整体 token 消耗可能在 100k 左右，整体时间大于 30min。虽然成本比较高，模型经历了很多轮迭代，但结果还是很让人意外的，未来通过一定程度的 harness 优化想来可以减少消耗。

## Clight

`fabs` 的 Clight 代码如下：

```c
Definition f_fabs_musl := {|
  fn_return := tdouble;
  fn_callconv := cc_default;
  fn_params := ((_x, tdouble) :: nil);
  fn_vars := ((_u, (Tunion __1049 noattr)) :: nil);
  fn_temps := ((_t'2, tulong) :: (_t'1, tdouble) :: nil);
  fn_body :=
(Ssequence
  (Sassign (Efield (Evar _u (Tunion __1049 noattr)) _f tdouble)
    (Etempvar _x tdouble))
  (Ssequence
    (Ssequence
      (Sset _t'2 (Efield (Evar _u (Tunion __1049 noattr)) _i tulong))
      (Sassign (Efield (Evar _u (Tunion __1049 noattr)) _i tulong)
        (Ebinop Oand (Etempvar _t'2 tulong)
          (Ebinop Odiv
            (Eunop Oneg (Econst_long (Int64.repr 1) tulong) tulong)
            (Econst_int (Int.repr 2) tint) tulong) tulong)))
    (Ssequence
      (Sset _t'1 (Efield (Evar _u (Tunion __1049 noattr)) _f tdouble))
      (Sreturn (Some (Etempvar _t'1 tdouble))))))
|}.
```

GLM-5.2 关注：

```c
(Sassign (Efield (Evar _u (Tunion __1049 noattr)) _f tdouble)
    (Etempvar _x tdouble))
```

证明目标是：

1. 这一步执行确实把 `x` 的值存储到了 `u.f` 中；
2. 并且 `u.i` 也正确地反映了 `x` 的二进制表示。

## Proof

完整的证明文件 `step_demo.v` 可以在 [这里](https://github.com/su1furicacid/math_verify/blob/main/src/step_demo.v) 找到。下面从头逐行讲解。

### CompCert 与 Clight

[CompCert](https://compcert.org/) 是一个用 Coq 编写并形式化验证的 C 编译器。它的编译流程是一串中间语言：

```
C 源码 → Clight → Csharpminor → Cminor → ... → 汇编
```

每一层都有形式化的语义（用 Coq 的 `Inductive` 定义），每一层之间的翻译都有正确性证明。我们操作的是 **Clight**——最接近 C 源码的中间表示。

CompCert 自带 `clightgen` 工具，可以把 `.c` 文件翻译成 `.v` 文件（Coq 源码），里面是 Clight 的 AST。`fabs_musl.v` 就是这么生成的。

### Clight 的 `step` 语义

Clight 用**小步操作语义**（small-step operational semantics）定义程序的执行。核心是一个 Coq 归纳关系：

```coq
Inductive step : state -> trace -> state -> Prop :=
  | step_assign: ...
  | step_set: ...
  | step_call: ...
  | ...
```

`step s1 t s2` 读作"状态 `s1` 一步转移到 `s2`，产生事件序列 `t`"。每个构造子是一条转移规则。

#### 状态

```coq
Inductive state :=
  | State: function -> statement -> cont -> env -> temp_env -> mem -> state
  | Callstate: ...
  | Returnstate: ...
```

`State f s k e le m` 的六个字段：

| 字段 | 类型 | 含义 |
|------|------|------|
| `f` | `function` | 当前函数（AST） |
| `s` | `statement` | **即将执行的**下一条语句 |
| `k` | `cont`（续延） | 执行完 `s` 后做什么 |
| `e` | `env` | 局部变量 → 内存位置的映射 |
| `le` | `temp_env` | 临时变量 → 值的映射 |
| `m` | `mem` | 完整的内存状态 |

在证明中，初始状态 `s0` 和终止状态 `s1` 是：

```coq
Definition s0 : state := State f_fabs_musl stmt_1 Kstop e0 le0 m0.
Definition s1 : state := State f_fabs_musl Sskip Kstop e0 le0 m1.
```

唯一变化：语句从 `u.f := x` 变成 `Sskip`（表示这条语句执行完了），内存从 `m0` 变成 `m1`（多了写入的数据）。

#### `step_assign` 规则

`u.f := x` 匹配的规则是 `step_assign`（Clight.v:561）：

```coq
| step_assign: forall f a1 a2 k e le m loc ofs bf v2 v m',
    eval_lvalue e le m a1 loc ofs bf ->        (* 1. 求左值 *)
    eval_expr e le m a2 v2 ->                   (* 2. 求右值 *)
    sem_cast v2 (typeof a2) (typeof a1) m = Some v ->  (* 3. 类型转换 *)
    assign_loc ge (typeof a1) m loc ofs bf v m' ->     (* 4. 写入内存 *)
    step (State f (Sassign a1 a2) k e le m)
         E0 (State f Sskip k e le m')
```

要证明 `u.f := x` 一步执行，需要证明四件事：

1. **左值求值**：`u.f` 对应哪个内存位置？
2. **右值求值**：`x` 的值是什么？
3. **类型转换**：把值从源类型转成目标类型
4. **写入内存**：把值写到内存位置，得到新内存

### 全局环境 `genv`

`step_assign` 的第 4 个前提中出现了 `ge`——全局环境。Clight 的全局环境是一个 record：

```coq
Record genv := {
  genv_genv : Genv.t fundef type;   (* 全局函数表: 函数名 → 函数定义 *)
  genv_cenv : composite_env          (* 复合类型表: struct/union 名 → 定义 *)
}.
```

`genv_genv` 是函数查找表，程序里调用 `foo()` 时靠它查 `foo` 的函数定义。它不对应物理内存上的函数表——到了汇编层函数才存在于内存的代码段，Clight 层面只是一个 Coq 数据结构。

`genv_cenv` 是 struct/union 类型查找表，访问 union/struct 成员时（如 `u.f`）靠它查类型信息。

#### composite 是什么

C 语言的 `struct` 和 `union` 在 CompCert 中统称为 **composite**（复合类型），有两层表示：

第一层是 `composite_definition`——源码级的定义，直接对应 C 源码：

```coq
Inductive composite_definition : Type :=
  Composite (id: ident) (su: struct_or_union) (m: members) (a: attr).
```

fabs 的 union 在源码里是 `union { double f; uint64_t i; }`，对应：

```coq
Composite __1049 Union
  (Member_plain _f tdouble ::      (* 成员 f: double *)
   Member_plain _i tulong :: nil)  (* 成员 i: uint64_t *)
  noattr
```

这只是语法的记录——"有一个 union，两个成员 `f` 和 `i`"，没有算任何布局信息。

第二层是 `composite`——带预计算布局的 record。`build_composite_env` 把 `composite_definition` 列表加工成 `composite`：

```coq
Record composite : Type := {
  co_su      : struct_or_union;     (* Struct 或 Union *)
  co_members : members;             (* 成员列表 *)
  co_attr    : attr;
  co_sizeof  : Z;                   (* 预计算的总大小 *)
  co_alignof : Z;                   (* 预计算的对齐 *)
  co_rank    : nat;
  co_sizeof_pos     : co_sizeof >= 0;           (* 大小非负 *)
  co_alignof_two_p  : exists n, ...;            (* 对齐是 2 的幂 *)
  co_sizeof_alignof : (co_alignof | co_sizeof);  (* 对齐整除大小 *)
}.
```

fabs 的 union 加工后：`co_sizeof = 8`（`max(8, 8) = 8`），`co_alignof = 8`。后三个字段是 proof——保证大小和对齐满足 C 标准。

`composite_env` 就是 `ident → composite` 的 PTree 查找表。程序的 `prog_comp_env` 字段就是这个类型。

#### 绕过 `globalenv` 的 OOM

CompCert 提供了现成的构造函数：

```coq
Definition globalenv (p: program) :=
  {| genv_genv := Genv.globalenv p;          (* 遍历所有函数定义 *)
     genv_cenv := p.(prog_comp_env) |}.       (* 直接取，很轻量 *)
```

但 `Genv.globalenv p` 对 `prog_defs` 做 `fold_left`，要逐个处理 40 多个 `__builtin_*`、`__compcert_i64_*` 函数定义，构造一个巨大的 PTree。`vm_compute` 试图计算它时内存爆炸（OOM，exit 137）。

关键观察：`step_assign` 只碰 `genv_cenv`（查 union 成员信息），完全不碰 `genv_genv`（查函数符号）。所以给 `genv_genv` 塞一个空表就行：

```coq
Definition ge : Clight.genv :=
  {| genv_genv := @Genv.empty_genv fundef type prog.(prog_public);
     genv_cenv := prog.(prog_comp_env) |}.
```

`@Genv.empty_genv` 构造一个符号表和定义表都是空 PTree 的全局环境，几乎零成本。`@` 是因为 `Genv` 模块的类型参数 `F` 和 `V` 无法从空 PTree 推断，必须手动指定为 `fundef` 和 `type`。`prog.(prog_public)` 是公开符号列表，填进去让类型正确就行，证明中不会查它。

而 `prog.(prog_comp_env)` 只有一个 union，PTree 很小，`vm_compute` 瞬间算完。

### CompCert 的内存模型

理解第二个证明（桥接引理）需要先了解 CompCert 的内存模型。

#### 内存 = 分块的字节数组

CompCert 的 `mem` 不是一坨平坦的字节流，而是**分块的**（block-based）：

- 内存由若干 **block** 组成，每个 block 有一个 ID（正整数）
- 每个 block 内部按**字节偏移**寻址
- 每个字节有**权限**（Readable / Writable / Nonempty / Freeable）

fabs 中，局部变量 `u` 是一个 union，分配在栈上一个 block `b_u` 里，有 8 字节（`double` 和 `uint64_t` 共享）。

#### memory_chunk——读写的"格式"

读写内存时必须指定 **chunk**（数据宽度+类型）：

| chunk | 大小(字节) | 对齐 | 对应 C 类型 |
|-------|-----------|------|------------|
| `Mint32` | 4 | 4 | `int` |
| `Mint64` | 8 | 8 | `int64_t` |
| `Mfloat32` | 4 | 4 | `float` |
| `Mfloat64` | 8 | **4** | `double` |

注意：`Mint64` 和 `Mfloat64` **大小相同（8字节）但对齐不同**（8 vs 4）。这个差异后来会带来麻烦。

#### 值的编码

写入时，值被**编码**成字节序列；读取时，字节序列被**解码**成值：

```
写入: Vfloat x_val  --encode_val Mfloat64-->  [8 字节]
读取: [8 字节]  --decode_val Mint64--> Vlong (Float.to_bits x_val)
```

`encode_val Mfloat64 (Vfloat f)` 把浮点数的 IEEE 754 位模式编码成 8 字节。`decode_val Mint64` 把 8 字节解码成 `int64`。因为 IEEE 754 双精度的位模式就是 8 字节整数，所以这两个操作的组合恰好实现了浮点到整数的类型双关。

### 证明一：`step_assign_fabs`——一步执行

#### 前提条件

```coq
Variable b_u  : block.
Variable m0   : mem.
Variable x_val : Floats.float.

Hypothesis m0_writable : Mem.valid_access m0 Mfloat64 b_u 0 Writable.
```

`b_u` 是 union `u` 所在的内存块 ID，`m0` 是初始内存，`x_val` 是参数 `x` 的浮点值。唯一的假设是 `m0` 对 `b_u` 偏移 0 有 `Mfloat64 Writable` 权限——即这块内存可写。

#### 环境构造

```coq
Definition e0 : env :=
  PTree.set _u (b_u, Tunion __1049 noattr) (PTree.empty (block * type)).
```

局部变量环境：`_u` 映射到 `(b_u, Tunion __1049)`，即变量 `u` 在内存块 `b_u` 中，类型是 union `__1049`。

```coq
Definition le0 : temp_env :=
  PTree.set _x (Vfloat x_val)
    (PTree.set _t'2 Vundef
       (PTree.set _t'1 Vundef (PTree.empty val))).
```

临时变量环境：`_x` 映射到 `Vfloat x_val`（参数值），`_t'1` 和 `_t'2` 是 `Vundef`（后面会用到的临时变量）。

```coq
Definition m1 : mem :=
  match Mem.store Mfloat64 m0 b_u 0 (Vfloat x_val) with
  | Some m' => m'
  | None => m0
  end.
```

`m1` 是把 `x_val` 以 `Mfloat64` 格式写入 `b_u:0` 后的内存。如果写入失败（不应该发生），就用 `m0` 兜底。

#### 辅助引理：`store_m1`

```coq
Lemma store_m1 : Mem.storev Mfloat64 m0 (Vptr b_u Ptrofs.zero) (Vfloat x_val) = Some m1.
```

`storev` 是 `store` 的"值地址"版本——接受 `Vptr b_u ofs` 而不是分开的 `b_u` 和 `ofs`。这个引理把 `m0_writable` 假设转化为等式形式，供后面 `assign_loc_value` 使用。

#### 证明目标

```coq
Lemma step_assign_fabs : step2 ge s0 E0 s1.
```

`step2 ge` 是 `step ge (function_entry2 ge)` 的简写——使用"参数作为临时变量"的函数入口策略。`E0` 是空 trace（这条语句不产生外部事件，如 I/O）。

#### 证明过程

```coq
Proof.
  unfold s0, s1. unfold stmt_1.
  eapply step_assign.
```

展开状态定义后，`eapply step_assign` 把目标分解为 4 个子目标，对应 `step_assign` 规则的 4 个前提。

**前提 1：求左值 `u.f`**

```coq
  - eapply eval_Efield_union.
```

要证明 `eval_lvalue (Efield (Evar _u) _f) b_u 0 Full`，即 `u.f` 的内存位置是 `(b_u, 0)`。`eval_Efield_union` 规则又分解为 4 个子目标：

1. **`eval_expr (Evar _u) (Vptr b_u 0)`**——变量 `u` 求值为指向 `b_u` 偏移 0 的指针：
   - `eval_Evar_local`：从 `e0` 查表得 `_u ↦ (b_u, Tunion __1049)`
   - `deref_loc_copy`：`Tunion` 的 `access_mode = By_copy`，返回 `Vptr b_u 0`

2. **`typeof (Evar _u) = Tunion __1049 noattr`**——类型反射，`reflexivity`

3. **`ge.(genv_cenv) ! __1049 = Some co`**——复合环境中有这个 union 的定义：
   ```coq
   vm_compute. reflexivity.
   ```
   `vm_compute` 瞬间算出 `prog.(prog_comp_env) ! __1049 = Some {...}`

4. **`union_field_offset ge _f (co_members co) = OK (0, Full)`**——`f` 在 union 中的偏移：
   ```coq
   vm_compute. reflexivity.
   ```
   union 所有成员偏移都是 0，`vm_compute` 算出 `OK (0, Full)`

**前提 2：求右值 `x`**

```coq
  - eapply eval_Etempvar. unfold le0. reflexivity.
```

从临时变量环境 `le0` 查表得 `_x ↦ Vfloat x_val`。

**前提 3：类型转换**

```coq
  - reflexivity.
```

`sem_cast (Vfloat x_val) tdouble tdouble m0 = Some (Vfloat x_val)`——同类型转换是恒等。

**前提 4：写入内存**

```coq
  - eapply assign_loc_value.
    + reflexivity.      (* access_mode tdouble = By_value Mfloat64 *)
    + exact store_m1.   (* storev ... = Some m1 *)
```

`assign_loc_value` 规则需要两个前提：`access_mode tdouble = By_value Mfloat64`（`double` 按值存储），以及 `storev` 成功——后者正是辅助引理 `store_m1`。

至此，`step_assign_fabs` 证明完毕。

### 证明二：`H1_bridge`——桥接引理

#### 证明目标

```coq
Theorem H1_bridge :
  Mem.load Mint64 m1 b_u 0 = Some (Vlong (Float.to_bits x_val)).
```

在写入 `u.f = x_val`（以 `Mfloat64` 格式）之后，如果以 `Mint64` 格式读取同一内存位置，得到的是 `x_val` 的 IEEE 754 位模式（作为 `int64`）。

这就是 C 语言 union type-punning 的本质——**以 `double` 格式写入，以 `int64_t` 格式读取，得到的是同一个位模式**。

#### 为什么需要这个引理

fabs 的逻辑链是：

```
① u.f := x        →  step_assign_fabs 证明（内存 m0→m1，写入 x_val）
② u.i = bits(x)    →  H1_bridge 证明（读 m1 得 Float.to_bits x_val）
③ u.i &= mask      →  （后续：位操作清除符号位）
④ u.f = |x|        →  （后续：逆向桥接，读回浮点数）
```

`H1_bridge` 是这条链的第二环——它证明浮点到整数的 type-punning 在 CompCert 内存模型中是合法的。

#### 失败的第一次尝试：`load_store_similar`

最初想用 CompCert 的 `load_store_similar` 定理（Memory.v:1053）：

```coq
Theorem load_store_similar:
  forall chunk',
  size_chunk chunk' = size_chunk chunk ->
  align_chunk chunk' <= align_chunk chunk ->    (* ← 这个前提！ *)
  exists v', load chunk' m2 b ofs = Some v' /\ ...
```

前提要求 `align_chunk chunk' <= align_chunk chunk`，即读取的对齐 ≤ 写入的对齐。但：

```
align_chunk Mint64   = 8
align_chunk Mfloat64 = 4
```

`8 <= 4` 不成立！这个定理用不了。

#### 成功的方案：`loadbytes_store_same` + `loadbytes_load` + `decode_encode_val_general`

绕过 `load_store_similar`，用三步组合：

**Step 1**：确认存储成功了

```coq
assert (STORE : Mem.store Mfloat64 m0 b_u 0 (Vfloat x_val) = Some m1).
```

从 `m0_writable` 和 `valid_access_store` 得出。

**Step 2**：存储后的字节内容

```coq
assert (LBS : Mem.loadbytes m1 b_u 0 (size_chunk Mfloat64)
              = Some (encode_val Mfloat64 (Vfloat x_val))).
{ eapply Mem.loadbytes_store_same. exact STORE. }
```

用 CompCert 定理 `loadbytes_store_same`——存储后，`loadbytes`（读原始字节）返回的就是 `encode_val` 编码后的值。

**Step 3**：chunk 大小相同

```coq
assert (LBS' : Mem.loadbytes m1 b_u 0 (size_chunk Mint64)
               = Some (encode_val Mfloat64 (Vfloat x_val))).
{ replace (size_chunk Mint64) with (size_chunk Mfloat64) by reflexivity. exact LBS. }
```

`size_chunk Mint64 = size_chunk Mfloat64 = 8`，所以读 8 字节的 `Mint64` 版本和 `Mfloat64` 版本一样。

**Step 4**：对齐条件

```coq
assert (AL : (align_chunk Mint64 | 0)).
{ cbn. exists 0%Z. reflexivity. }
```

`align_chunk Mint64 = 8`，`8 | 0` 成立（0 是任何数的倍数）。这是下一步 `loadbytes_load` 的前提。

**Step 5**：从 `loadbytes` 到 `load`

```coq
assert (LOAD : Mem.load Mint64 m1 b_u 0
               = Some (decode_val Mint64 (encode_val Mfloat64 (Vfloat x_val)))).
{ apply Mem.loadbytes_load with (bytes := encode_val Mfloat64 (Vfloat x_val)).
  - exact LBS'.
  - exact AL. }
```

用 CompCert 定理 `loadbytes_load`（Memory.v:756）——如果有 `loadbytes = Some bytes` 且对齐满足，则 `load = Some (decode_val chunk bytes)`。

这一步不能 `unfold Mem.load` 因为它是 `Global Opaque`（Memory.v:4532）。`loadbytes_load` 是 CompCert 提供的官方桥梁，在不展开 `load` 的情况下推导其值。

**Step 6**：decode-encode 的逆

```coq
assert (DECODE : decode_val Mint64 (encode_val Mfloat64 (Vfloat x_val))
                 = Vlong (Float.to_bits x_val)).
{ assert (D : decode_encode_val (Vfloat x_val) Mfloat64 Mint64
                 (decode_val Mint64 (encode_val Mfloat64 (Vfloat x_val)))).
  { apply decode_encode_val_general. }
  unfold decode_encode_val in D. exact D. }
```

用 CompCert 定理 `decode_encode_val_general`（Memdata.v:524）——对任意 chunk 组合，`decode_val chunk2 (encode_val chunk1 v)` 满足 `decode_encode_val v chunk1 chunk2 ...`。

展开 `decode_encode_val`（Memdata.v:484）的 `Vfloat f, Mfloat64, Mint64` 分支：

```coq
| Vfloat f, Mfloat64, Mint64 => v2 = Vlong(Float.to_bits f)
```

所以 `decode_val Mint64 (encode_val Mfloat64 (Vfloat x_val)) = Vlong (Float.to_bits x_val)`。

最后 `rewrite DECODE in LOAD` 完成证明。

### 工程技巧总结

整个证明过程中遇到了三个工程障碍：

1. **`globalenv` OOM**：`Genv.globalenv prog` 遍历 40+ 个内建函数定义，`vm_compute` 时 OOM。解决方法：手动构造 `ge`，`genv_genv` 用空环境，因为 `step_assign` 只访问 `genv_cenv`。

2. **`load_store_similar` 不可用**：`align_chunk Mint64 (8) > align_chunk Mfloat64 (4)`，前提不成立。解决方法：改用 `loadbytes_store_same` + `loadbytes_load` + `decode_encode_val_general` 的三步组合，绕过对齐约束。

3. **`Mem.load` 是 Opaque**：`Global Opaque Mem.load`（Memory.v:4532），不能 `unfold`。解决方法：用 `loadbytes_load` 定理在不展开 `load` 的情况下推导其值。

