---
title: Category Theory for Programmers 1-7
date: 2026-09-14
summary: Notes on Category Theory for Programmers, chapters 1-7.
tags:
    - Category Theory
    - Haskell
---

# Category Theory for Programmers 1-7

## Chapter 1, Category: The Essence of Composition

简单引入了一下范畴，及其在计算机科学中的意义。

范畴是对象及态射的组合。范畴的精髓在于组合。

组合具备两个性质：

1. **结合律**：组合的顺序不影响结果。

2. **恒等律**：每个对象都有一个恒等态射，组合它不会改变对象。

编程的本质就是分解和组合。受限于人类的心智负担，我们往往将大问题分解成小问题，实现小问题之后，忽略实现的细节，将小问题组合成大问题的解决方案。在这个层面上，范畴论提供了一个抽象的框架来理解这种分解和组合的过程。

## Chapter 2, Types and Functions

类型能够检查并拒绝一部分错误的程序。但是类型系统并不能完全保证程序在语义上正确。

类型的最简单和最直观的理解是值的集合。比如 `Char` 类型的值是所有字符的集合，`Int` 类型的值是所有整数的集合。接下来，集合对应的范畴称为 Set。Set 范畴中对象是集合，态射则是从一个集合到另一个集合的映射，即函数。但是在 Haskell 中，某些函数可能涉及递归而不能终止，此时 Haskell 函数就无法从一个集合映射到另一个集合。Haskell 的一种处理方法是引入 Bottom，这个 Bottom 是所有类型的成员。可能返回 Bottom 的函数称为部分函数（Partial Function），因此 Haskell 类型和函数构成的范畴称为 Hask 而非 Set。

相比操作语义，指称语义更适合对程序进行形式化证明，因为所有程序行为都被映射到数学对象上。使用范畴可以让我们在程序和数学对象之间建立关系。

在编程语言中，给定相同输入总是产生相同结果、且没有副作用的函数，称为纯函数。在 Haskell 这样的纯函数式语言中，所有函数都是纯的。副作用是指函数在执行过程中对外部环境产生的影响，比如修改全局变量、打印输出、抛出异常等。真实环境中可能无法避免副作用，比如 IO 操作，但是使用一些工具可以将副作用封装起来，使得程序的核心逻辑仍然保持纯函数的特性。

`Void` 是 Haskell 中对应空集的类型。`absurd` 是一个函数，它的输入类型是 `Void`，输出类型是任意类型 `a`。由于 `Void` 类型没有值，因此 `absurd` 函数永远不会被调用，因为根本构造不出任何参数值。如果对 C-H 同构有了解，这个在逻辑上对应 `False -> ...`，即从假命题可以推出任意命题。

```haskell
absurd :: Void -> a
```

Haskell 中 `()` 类型对应单元素集合，`()` 是它的唯一值。当 `()` 作为参数类型时，通过传入 `()` 值来调用函数。当 `()` 作为返回类型时，函数的返回值总是 `()`。这对应 C++ 中的 `void` 类型。比如：

```haskell
f44: () -> Int
f44 () = 44

unit :: Int -> ()
unit _ = ()
```

#### Challenges

1. 

```python
def memoize(f):
    cache = {}
    def memoized(x):
        if x not in cache:
            cache[x] = f(x)
        return cache[x]
    return memoized
```

使用 Haskell 写这个 memoize 比较困难。

2. 不能随机化。

3. 记忆化种子是正确的。

4. (a) 纯的；(b) 不纯；(c) 不纯；(d) 不纯。

5. 从语法上比较 Bool 到 Bool 有无穷多种函数，但是从语义上比较，只有四种函数：恒真、恒假、恒等、取反，恰好对应 4 个态射。

6. 

```
        → Void      → ()       → Bool
Void      id          unit       absurd
()        （无）       id         true, false
Bool      （无）       unit       id, not, yes, no
```

## Chapter 3, Categories Great and Small

最简单的范畴是一个没有对象或态射的空范畴（这可能在范畴的范畴中很有用）。如果从有向图出发，图中的每个节点都对应一个对象，这个图上所有潜在的边都对应一个态射，就得到了一个范畴（这个从有向图构建的范畴也称为自由范畴）。

预序集、偏序集和全序集都可以被构造成范畴。以预序集为例，预序集中的元素对应范畴中的对象，预序关系对应态射。

在范畴 $C$ 中，取两个对象 $a$ 和 $b$，他们之间的态射集合被称为 Hom 集 $Hom_C(a, b)$。预序集的一个特点是两个元素中只存在一个态射。因此，预序集的 Hom 集要么是空集，要么是单元素集合。在偏序集和全序集中同理。

幺半群（Monoid）是配备了一个二元运算 $\cdot$ 和一个单位元素 $e$，满足结合律和单位律的数学结构。

比如可以在 Haskell 中这样定义幺半群，并给出一个实例：

![alt text](<Category Theory for Programmers 1-7/image.png>)

每个幺半群都可以被描述为一个单对象范畴，每个幺半群的元素都被构造为一个这个单对象到自身的态射，比如单位元素 $e$ 对应恒等态射，字符串 `"abc"` 对应态射 `(++) "abc"`，可以发现恰好 `mappend` 将幺半群集合中的一个元素映射为作用于该集合的一个函数，而态射复合即函数复合 `.`。

#### Challenges

1. 略

2. (a) 偏序集；(b) 感觉得考虑类型的同构，暂且可以看成预序集？

3. (Bool, &&, True), (Bool, ||, False)

4. 单对象为 Bool，(&& True) 为恒等态射，(&& False) 是另一个态射，把所有 Bool 映射为 False。

5. 单对象为 Z，态射分别为 (+) 0, (+) 1, (+) 2，态射的复合可以列个表，比如 (+) 1 . (+) 2 = (+) 0，满足结合律和单位律。

## Chapter 4, Kleisli Categories

前面几个章节的工作都集中在纯函数上，这一章会引入 Monad 来处理副作用。从一个例子出发：

```c 
string logger;  
bool negate(bool b) {  logger += "Not so! "; return !b; }
```

这个 `negate` 函数有副作用，它会修改外部的 `logger` 变量。在现代并发编程中，这可能导致数据竞争或者其他不可预测的行为。

一个解决方法是，把 `logger` 作为函数的参数传入：

```c
pair<string, bool> negate(string logger, bool b) {  logger += "Not so! "; return {logger, !b}; } 
```

作为 API 这个设计不够好，程序员不得不在调用这个 API 时关注 `logger` 对象的管理。一个更好的抽象是，将副作用作为函数的返回值的一部分：

```c
pair<string, bool> negate(bool b) {  return { "Not so! ", !b }; } 
```

在这个例子中，假如我们有另外的一个函数 `identity : bool -> bool`，它的实现是：

```c
bool identity(bool b) { logger += "So! "; return b; } 
```

相似地，这个函数也会被提升为：

```c
pair<string, bool> identity(bool b) {  return { "So! ", b }; } 
```

这意味着原先的函数复合 `identity(negate(...))` 不再正确，因为 `negate` 的返回值是一个 pair，而 `identity` 期望的输入是一个 bool。为了让这两个函数可以复合，我们需要一个新的复合，它能从 `negate` 的返回值中提取出 bool 值，然后传递给 `identity`，同时把两个 log 信息合并起来。

用 Haskell 更容易表达，定义一个 Writer 类型：

```haskell
type Writer a = (a, String)
```

态射是 `a -> Writer b` 的函数，我们用 `>=>` 来表示这种态射的复合：

```haskell
(>=>) :: (a -> Writer b) -> (b -> Writer c) -> (a -> Writer c)
```

`>=>` 的实现是：

```haskell
f >=> g = \x -> let (y, log1) = f x
                    (z, log2) = g y
                in (z, log1 ++ log2)
```

在这个范畴内的恒等态射是 `return` 函数，它将一个值提升为 Writer 类型：

```haskell
return :: a -> Writer a
return x = (x, "")
```

这就是 Kleisli 范畴的一个基本例子。Kleisli 范畴是基于 Monad 的范畴，就目前我们的讨论而言，一个 Kleisli 范畴以底层编程语言的类型作为对象；从类型 A 到类型 B 的态射，是从 A 到某个由 B 经过特定修饰派生出来的类型的函数。每个 Kleisli 范畴都定义了自己的一套复合这类态射的方式，以及相对于该复合的恒等态射。

#### Challenges

1. 

定义一个 Maybe Monad：

![alt text](<Category Theory for Programmers 1-7/image-1.png>)

2 3. 类似

## Chapter 5, Products and Coproducts

范畴论中有一个用于依据关系来定义对象的常见构造，叫做泛构造（universal construction）。做法之一是：先挑出一个由对象和态射搭成的特定形状，然后在范畴中寻找它的所有出现。

初始对象是这样一类对象：对范畴中的任何对象，从初始对象出发到该对象的态射是唯一的。初始对象并不是唯一的，但是在同构意义下是唯一的。

在集合与函数构成的范畴中，初始对象是空集 $\emptyset$，因为从空集到任意集合的函数都是唯一的：一个没有意义的空函数。在 Haskell 中，空集对应 `Void` 类型，从 `Void` 到任意类型的函数对应 `absurd` 函数。

```haskell 
absurd :: Void -> a
```

类似的（稍后我们会说这个对偶关系），终止对象定义为：对范畴中的任何对象，从该对象出发到终止对象的态射是唯一的。

在集合与函数构成的范畴中，终止对象是单元素集合 $\{()\}$。在 Haskell 中，单元素集合对应 `()` 类型，从任意类型到 `()` 的函数对应 `unit` 函数。

```haskell
unit :: a -> ()
unit _ = ()
```

直观上，定义始对象和终对象的方式之间存在着一种对称性。对任何范畴 $C$，我们可以反转所有态射的方向，得到一个新的范畴 $C^{op}$。终止对象就是初始对象。

态射 $g$ 是态射 $f$ 的逆，当且仅当 $f$ 和 $g$ 的复合是恒等态射。初始对象在同构意义下唯一是因为：假设两个初始对象 $a$ 和 $b$，由初始对象的原始定义可知 $a$ 到 $b$ 的态射是唯一的，$b$ 到 $a$ 的态射也是唯一的，因此 $a$ 和 $b$ 之间的态射复合是 $a$ 到 $a$ 的态射，又因为 $a$ 到 $a$ 的态射是唯一的，所以这个复合态射只能是恒等态射。

积类型也可以在范畴中找到类似的泛构造。我们构造这样的一个模式，一个对象 $c$ 和分别连接到两个对象 $a$ 和 $b$ 的态射 $p :: c -> a$ 和 $q :: c -> b$。

在集合和函数构成的范畴中，已知两个对象 $Int$ 和 $Bool$，能找出很多符合要求的对象 $c$，比如 $(Int, Int, Bool)$、$(Int, Bool)$、$(Bool, Int)$ 甚至 $Int$。泛构造的另一半是排名。假设两个对象 $c'$ 和 $c$ 都满足了上面的模式，如果存在一个从 $c'$ 到 $c$ 的态射，那么 $c$ 就比 $c'$ 更好；此外， $c'$ 的投影可以通过 $c$ 的投影还原出来。

TBD