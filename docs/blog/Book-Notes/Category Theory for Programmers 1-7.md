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

TBD