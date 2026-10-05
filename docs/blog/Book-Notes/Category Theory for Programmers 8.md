---
title: Category Theory for Programmers 8
date: 2026-09-14
summary: Notes on Category Theory for Programmers, chapters 8.
tags:
    - Category Theory
    - Haskell
---

# Category Theory for Programmers 8

## Chapter 8, Functoriality

因为函子是范畴的范畴的态射，所以很多关于态射的直觉也适用于函子。双函子（Bifunctor）把两个范畴 $C$ 和 $D$ 中的对象和态射映射到一个范畴 $E$。如果构造一个积范畴 $C \times D$，那么双函子实际上就是这个积范畴到范畴 $E$ 的普通函子。可以固定一个参数，把双函子理解为普通函子，不过分别的函子性并不能保证联合函子性成立，这称为前幺半范畴（关于这一点原文并没有展开说明）。

```haskell
class Bifunctor f where
  bimap  :: (a -> c) -> (b -> d) -> f a b -> f c d
  bimap g h = first g . second h          

  first  :: (a -> c) -> f a b -> f c b
  first g = bimap g id                   

  second :: (b -> d) -> f a b -> f a d
  second  = bimap id                     
```

在实现 `Bifunctor` 的一个实例时，要不然给出 `bimap` 的实现，要不然分别给出 `first` 和 `second` 的实现，如果同时给出则需要保证联合函子性。

双函子的一个重要例子就是范畴的积和余积：

```haskell
instance Bifunctor (,) where
  bimap f g (x, y) = (f x, g y)

instance Bifunctor Either where
  bimap f _ (Left x) = Left (f x)
  bimap _ g (Right y) = Right (f y)
```

既然我们已经处理了积和余积，自然地，所有的代数数据类型都可以是函子，只需要对它们进行结构归纳就行。在 Haskell 中，可以这样为代数数据类型自动生成 fmap：

```haskell
{-# LANGUAGE DeriveFunctor #-}
data Maybe a = Nothing | Just a deriving Functor
```

TBD
