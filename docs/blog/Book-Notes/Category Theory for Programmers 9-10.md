---
title: Category Theory for Programmers 9-10
date: 2026-10-06
summary: Notes on Category Theory for Programmers, chapters 9-10.
tags:
    - Category Theory
    - Haskell
---

# Category Theory for Programmers 9

## Chapter 9, Function Types

我们之前已经见识过，在 Set 范畴中，对象 $a$ $b$ 的 hom 集 $hom(a, b)$ 恰好对应函数类型 $a \rightarrow b$，也在 Set 范畴中，这称为内部 hom 集。

使用泛构造的方式定义函数类型：一个函数类型 $z$ 和一个参数类型 $a$，二者的积 $z \times a$ 通过一个态射 $g$ 连接到另一个类型/对象 $b$（就像函数应用）；规定一个函数类型 $z$ 及其应用 $g$ 优于另一个 $z'$ 和 $g'$，当且仅当存在唯一的映射 $h: z' \rightarrow z$，使得 $g'$ 能经由 $g$ 分解：

$$
g' = g \circ (h \times id)
$$

（由于 $\times a$ 这个固定了一个参数的积类型可以被看作一个函子 $F$，因此 $h: z' \rightarrow a$ 可以被提升到 $F z' \rightarrow F z$ 即 $z' \times a \rightarrow z \times a$，此时 $F h = h \times id$）按照上述排序标准，最佳的对象就是 $a \Rightarrow b$。此时态射 $g$ 被称为 eval。

形式化地，函数对象是 $a \Rightarrow b$ 连同一条态射 $eval :: ((a \Rightarrow b) \times a) \rightarrow b$，使得对于任何其他对象 $z$ 以及任何态射 $g :: (z \times a) \rightarrow b$ 都存在唯一的态射 $h :: z \rightarrow (a \Rightarrow b)$，$g = eval \circ (h \times id)$。

泛构造在 $g$ 和 $h$ 之间建立了一种一一对应关系，把 $g$ 看成一个双参数函数，$h$ 看成一个接受一个参数返回一个函数的函数，这种对应叫做柯里化（Currying）。

Set 只是众多笛卡尔闭范畴（Cartesian Closed Categories）的一个例子。一个笛卡尔闭范畴必须满足：

- 终对象；
- 任意一对对象的积；
- 任意一对对象的指数（函数类型）。

笛卡尔闭范畴为简单类型 lambda 演算提供了基础。如果笛卡尔闭范畴还满足初始对象和余积，同时积能够对余积分配，那么它就被称为双笛卡尔闭范畴（Bicartesian Closed Categories）。Set 就是双笛卡尔闭范畴。

数学文献中，函数对象，也就是 $a$ 和 $b$ 之间的 hom 对象，通常记为 $b^a$，这在直观上很好理解。通过这个描述，我们实际上可以扩展代数数据类型，我们会发现很多关于幂运算的直觉对于指数类型（函数类型）也成立。

- $a^0 = 1$ 从初始对象到任意类型的态射只有一个，也就是一个单元素集合，正是 Set 的终止对象。在 Haskell 中这就对应 absurd 函数。
- $1^a = 1$ 从任何对象到终对象的态射只有一个。一般地，从 a 到终对象的内部 hom 对象，同构于终对象本身。在 Haskell 中从任意类型 a 到 unit 只有一个函数 unit。
- $a^1 = a$ 从终对象出发到对象 a 的态射同构于对象 a 本身。
- $a^(b+c) = a^b \times a^c$ 从范畴论的角度看，这说的是：从两个对象的余积出发的指数，同构于两个指数的积。在 Haskell 中，这个代数恒等式有一个非常实际的解释：它告诉我们，从两个类型的和出发的函数，等价于分别作用在各个类型上的一对函数。
- $(a^b)^c = a^(b \times c)$ 就是函数柯里化。
- $(a \times b)^c = a^c \times b^c$ 返回一个对的函数，等价于一对函数，各自产生这个对中的一个元素。

（不知道为什么作者会在这里提 C-H 同构。）

## Chapter 10, Natural Transformations

自然变换（Natural transformation）用于比较函子。

考虑范畴 $C$ 和 $D$ 之间的两个两个函子 $F$ 和 $G$，$C$ 中的对象 $a$ 被映射到 $D$ 中 $F a$ $G a$。一个自然变换是态射的一种选择，选择 $F a$ 到 $G a$ 的一条态射 $\alpha_a :: F a \rightarrow G a$，这条态射被称为自然变换 $\alpha$ 在 $a$ 处的分量（component）（如果不存在态射，那么 $F$ 和 $G$ 之间就没有自然变换）。 

函子还映射态射。对于态射 $f :: a \rightarrow b$，自然变换 $\alpha$ 提供这两条态射 $\alpha_a :: F a \rightarrow G a, \alpha_b :: F b \rightarrow G b$。施加自然性条件 $G f \circ \alpha_a = \alpha_b \circ F f$。

从逐分量的角度来看自然变换，可以说它把对象映射成了态射。而由于自然性条件的存在，也可以说它把态射映射成了可交换的正方形。

回到 Haskell，自然变换就是参数化多态函数：

```haskell
-- 对于所有的类型 a，都满足
alpha :: F a -> G a
```

同时，形如上述定义的多态函数自动满足自然性条件（得益于 Haskell 的自动类型推理，我们没必要指出 fmap 来自哪个函子定义，也没必要给出 alpha 的类型）：

```haskell
fmap f . alpha = alpha . fmap f
```

以函数 `safeHead` 为例：

```haskell
safeHead :: [a] -> Maybe a
safeHead [] = Nothing
safeHead x::xs = Just x
```

我们可以手动验证一下自然性条件：

```haskell
-- 假设 Maybe 函子和 List 函子的 fmap 定义：
fmap f Nothing = Nothing
fmap f (Just x) = Just (f x)
fmap f [] = []
fmap f (x:xs) = f x : fmap f xs

-- 那么有：
fmap f (safeHead []) = fmap f Nothing = Nothing
safeHead (fmap f []) = safeHead [] = Nothing

fmap f (safeHead (x:xs)) = fmap f (Just x) = Just (f x)
safeHead (fmap f (x:xs)) = safeHead (f x : fmap f xs) = Just (f x)
```

直观上理解，先换容器在对容器内的东西做操作，等价于先对容器内的东西做操作再换容器。

自然变换看上去可以直观的理解成函子之间的态射。那么函子本身看上去也能构成一个范畴。对于任意一对范畴 $C$ $D$，都存在一个对应的函子范畴 $Fun(C, D)$（或者 $[C, D]$、$D^C$），范畴中的对象是函子，态射是自然变换。自然变换的复合满足结合律。对于每个函子 $F$，都存在一个恒等自然变换 $1_F$，在对象 $a$ 上的分量是 $id_{F a} : F a \rightarrow F a$。

定义一个更高层次的范畴 $Cat$，函子范畴和我们之前经常讨论的 Set 范畴都是 $Cat$ 范畴中的对象。$Cat$ 中的 hom 集合就是一个函子的集合（函子范畴），$[C, D]$ 就是 $Hom_{Cat}(C, D)$。这和上一节中函数类型的表现很相似，同样可以把函子范畴写成一个指数对象 $D^C = Hom_{Cat}(C, D)$。$Cat$ 也是一个笛卡尔闭范畴。

TBD...
