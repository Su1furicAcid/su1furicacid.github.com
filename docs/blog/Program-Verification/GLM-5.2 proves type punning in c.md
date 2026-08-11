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

完整的证明文件 `step_demo.v` 可以在 [这里](https://github.com/su1furicacid/math_verify/blob/main/src/step_demo.v) 找到。

### 从 C 到 Clight

[CompCert](https://compcert.org/) 是一个用 Coq 写的、经过形式化验证的 C 编译器。编译流程经过多级中间语言：`C → Clight → Csharpminor → Cminor → ... → 汇编`，每一层都有形式化的语义定义，层与层之间的翻译有正确性证明。我们关心的是 Clight——最接近 C 源码的那一层。

CompCert 自带 `clightgen` 工具，把 `.c` 文件翻译成 `.v` 文件，里面是 Clight 的 AST。前文已经展示过 `fabs_musl.v` 的内容，GLM-5.2 要证明的东西可以归纳成两条：

1. `u.f := x` 这条赋值语句，在 Clight 的 `step` 语义下确实一步执行成功，把 `x_val` 写入了内存；
2. 写完之后，以 `Mint64` 格式读同一块内存，拿到的就是 `x_val` 的 IEEE 754 位模式（一个 `int64`）。

第一条证明赋值本身，第二条证明 union type-punning 的合法性。两条合在一起，才构成 fabs 后续位操作的基础。

### Clight 的执行模型

Clight 用小步操作语义定义程序执行。核心是一个 Coq 的 `Inductive` 关系：

```coq
Inductive step : state -> trace -> state -> Prop :=
  | step_assign: ...
  | step_set: ...
  | step_call: ...
  | ...
```

`step s1 t s2` 意思是状态 `s1` 一步转移到 `s2`，附带产生事件序列 `t`（比如 I/O 操作）。fabs 的赋值语句不产生任何外部事件，所以 `t = E0`（空 trace）。

状态 `State f s k e le m` 携带六个东西：当前函数 `f`、即将执行的语句 `s`、续延 `k`（执行完当前语句后去哪）、局部变量环境 `e`（变量名 → 内存位置）、临时变量环境 `le`（临时变量名 → 值）、内存 `m`。

对于 `u.f := x` 这条语句，执行前后两个状态是：

```coq
s0 = State f_fabs_musl stmt_1 Kstop e0 le0 m0
s1 = State f_fabs_musl Sskip  Kstop e0 le0 m1
```

只有两处变化：语句从 `stmt_1`（即 `u.f := x`）变成 `Sskip`（执行完了），内存从 `m0` 变成 `m1`（多了一次写入）。

`step_assign` 规则（Clight.v:561）把"一步赋值"拆成四个前提：

```coq
| step_assign: forall f a1 a2 k e le m loc ofs bf v2 v m',
    eval_lvalue e le m a1 loc ofs bf ->
    eval_expr e le m a2 v2 ->
    sem_cast v2 (typeof a2) (typeof a1) m = Some v ->
    assign_loc ge (typeof a1) m loc ofs bf v m' ->
    step (State f (Sassign a1 a2) k e le m) E0 (State f Sskip k e le m')
```

翻译过来就是：先算左值 `a1` 的内存位置 `(loc, ofs)`，再算右值 `a2` 的值 `v2`，做类型转换得到 `v`，最后把 `v` 写进内存得到 `m'`。证明目标就是逐一满足这四个前提。

### 全局环境：为什么不能直接用 `globalenv`

规则里出现的 `ge` 是全局环境，包含两张表：`genv_genv`（函数名 → 函数定义）和 `genv_cenv`（struct/union 名 → 类型定义）。在 fabs 的赋值语句里，访问 `u.f` 需要查 `genv_cenv` 找到 union `__1049` 的成员布局信息，但不需要查 `genv_genv`——因为这条语句里没有函数调用。

CompCert 提供了现成的 `globalenv` 构造函数，一行就能造出完整的 `ge`。但问题出在 `Genv.globalenv` 这个函数上：它对 `prog_defs` 做 `fold_left`，逐个处理程序里 40 多个 `__builtin_*`、`__compcert_i64_*` 内建函数定义，构造一棵巨大的 PTree。`vm_compute` 试图计算这棵树的时候直接 OOM（exit 137）。

解决办法是手工拼一个 `ge`，`genv_genv` 塞一个空的 PTree，`genv_cenv` 照常用 `prog.(prog_comp_env)`：

```coq
Definition ge : Clight.genv :=
  {| genv_genv := @Genv.empty_genv fundef type prog.(prog_public);
     genv_cenv := prog.(prog_comp_env) |}.
```

这里 `@` 是因为 `Genv` 模块带有类型参数 `F`（函数定义类型）和 `V`（类型信息），空 PTree 无法自动推断出这两个类型，只能手动写 `fundef` 和 `type`。`prog.(prog_public)` 是公开符号列表，填进去让 record 类型对上就行，反正在证明中永远不会查它。

`prog.(prog_comp_env)` 来自 `build_composite_env`——把源码级的 `composite_definition` 列表加工成带预计算布局的 `composite` record。对于 fabs 程序来说只有一个 union（两个成员 `f: double` 和 `i: uint64_t`），PTree 极小，`vm_compute` 瞬间算完。

### 内存模型

CompCert 的内存不是平坦的字节流，而是分块的：每个分配（变量、malloc 等）对应一个 block，用正整数 ID 标识，block 内部按字节偏移寻址，每个字节带权限（Readable / Writable / Nonempty / Freeable）。fabs 中的 union `u` 分配在栈上一个 block `b_u` 里，占 8 字节——`double` 和 `uint64_t` 共享这 8 字节，这就是 type-punning 的物理基础。

读写内存时要指定 **chunk**，也就是数据的宽度和对齐方式。和 fabs 相关的两个 chunk 是 `Mfloat64`（对应 `double`，8 字节，对齐 4）和 `Mint64`（对应 `int64_t`，8 字节，对齐 8）。两者大小一样，但对齐不同——这个差异后面会制造不小的麻烦。

值在写入时被 `encode_val` 编码成字节序列，读取时被 `decode_val` 解码。`encode_val Mfloat64 (Vfloat f)` 把浮点数的 IEEE 754 位模式编成 8 字节，`decode_val Mint64` 把 8 字节解成 `int64`。因为 IEEE 754 双精度的位模式本身就是 8 字节整数，所以"以 double 写入、以 int64 读取"拿到的就是同一个位模式。这正是桥接引理要形式化证明的东西。

### 第一个证明：`step_assign_fabs`

证明目标是 `step2 ge s0 E0 s1`，即状态 `s0` 一步转移到 `s1`。证明的设定部分有几个变量和假设：

```coq
Variable b_u  : block.       (* union u 的内存块 ID *)
Variable m0   : mem.          (* 初始内存 *)
Variable x_val : Floats.float. (* 参数 x 的值 *)
Hypothesis m0_writable : Mem.valid_access m0 Mfloat64 b_u 0 Writable.
```

唯一的假设是 `b_u` 偏移 0 处以 `Mfloat64` 格式可写。由此可以定义 `m1`——写入 `x_val` 后的内存，以及辅助引理 `store_m1`，把假设转成等式形式供后面使用。

`eapply step_assign` 把目标拆成四个子目标。

第一个子目标是求左值 `u.f` 的内存位置。`u` 是局部变量，从 `e0` 查到 `_u ↦ (b_u, Tunion __1049)`；union 的 `access_mode` 是 `By_copy`，所以 `deref_loc` 返回 `Vptr b_u 0`。然后查 `genv_cenv ! __1049` 确认这个 union 存在，再用 `union_field_offset` 算出成员 `_f` 的偏移——union 所有成员偏移都是 0。这两步用 `vm_compute` 直接算出来，因为 `prog.(prog_comp_env)` 只有这么一个 union，计算量极小。

第二个子目标是求右值 `x`，从临时变量环境 `le0` 查到 `_x ↦ Vfloat x_val`，一行搞定。

第三个是类型转换，`double → double` 恒等，`reflexivity`。

第四个是写入内存。`assign_loc_value` 需要 `access_mode tdouble = By_value Mfloat64`（成立）和 `storev` 成功（由辅助引理 `store_m1` 提供）。到此 `step_assign_fabs` 证完。

### 第二个证明：`H1_bridge`

桥接引理的命题是：

```coq
Mem.load Mint64 m1 b_u 0 = Some (Vlong (Float.to_bits x_val))
```

意思是：以 `Mfloat64` 写入 `x_val` 之后，以 `Mint64` 读同一位置，得到 `x_val` 的位模式。fabs 的完整证明链是 `u.f := x` → `u.i = bits(x)` → `u.i &= mask` → `u.f = |x|`，桥接引理是第二环。

一开始想用 CompCert 的 `load_store_similar` 定理。这个定理说的是：如果你用 chunk `c1` 写了一个值，那么用同样大小的 chunk `c2` 读，读出来的值和原值之间满足 `decode_encode_val` 关系。看起来正好。但前提要求 `align_chunk c2 <= align_chunk c1`，即读取的对齐不能超过写入的对齐。问题是 `align_chunk Mint64 = 8`，`align_chunk Mfloat64 = 4`，`8 <= 4` 不成立。定理用不了。

绕路的思路是：不直接从 `store` 跳到 `load`，而是中间多走一步 `loadbytes`。`loadbytes` 读的是原始字节，不关心 chunk 的对齐差异，所以不受这个限制。

具体分六步。先确认存储成功（`store ... = Some m1`）。然后用 `loadbytes_store_same` 定理拿到存储后的字节内容，就是 `encode_val Mfloat64 (Vfloat x_val)`。因为 `Mint64` 和 `Mfloat64` 的 `size_chunk` 都是 8，所以 `loadbytes` 以 `Mint64` 的参数读也一样。接着验证对齐条件 `align_chunk Mint64 | 0`——8 整除 0，平凡成立。有了 `loadbytes` 的结果和对齐条件，用 `loadbytes_load` 定理把它转成 `load` 的结果：`load Mint64 m1 b_u 0 = Some (decode_val Mint64 (encode_val Mfloat64 (Vfloat x_val)))`。这一步之所以要用定理而不是直接 `unfold Mem.load`，是因为 CompCert 在 Memory.v:4532 把 `Mem.load` 标记成了 `Global Opaque`，不允许展开。

最后一步是算 `decode_val Mint64 (encode_val Mfloat64 (Vfloat x_val))` 的值。CompCert 的 `decode_encode_val_general` 定理给出一个一般性的结论：对任意 chunk 组合，`decode_val chunk2 (encode_val chunk1 v)` 满足 `decode_encode_val v chunk1 chunk2 ...`。展开 `decode_encode_val` 的定义，`Vfloat f, Mfloat64, Mint64` 这个分支恰好是 `v2 = Vlong (Float.to_bits f)`。代入即得 `Vlong (Float.to_bits x_val)`，`rewrite` 进去，证毕。

### 三个坑

回头看，这个证明栽了三个跟头。

第一个是 `globalenv` 的 OOM。clightgen 生成的 `.v` 文件里带了 CompCert 全部 40 多个内建函数定义，`Genv.globalenv` 要 `fold_left` 遍历它们构造 PTree，`vm_compute` 扛不住。但 `step_assign` 只查 `genv_cenv`，根本不碰 `genv_genv`，所以空表就够了。

第二个是 `load_store_similar` 的对齐前提。`Mint64` 的对齐是 8，`Mfloat64` 的对齐是 4——同样是 8 字节的 chunk，对齐居然不一样。这导致"存 `Mfloat64` 取 `Mint64`"这个看似天然的操作不能用现成的定理直接搞定，得绕道 `loadbytes`。

第三个是 `Mem.load` 被 `Global Opaque` 标记。不能 `unfold` 它看内部结构，只能通过 `loadbytes_load` 这类定理间接推导。这大概是 CompCert 为了控制证明的计算行为而做的设计——`load` 的定义里有 `valid_access_dec`，展开后会产生大量子目标，不如用高层定理。

