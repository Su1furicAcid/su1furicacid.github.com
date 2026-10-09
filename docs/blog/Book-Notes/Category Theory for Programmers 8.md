---
title: Category Theory for Programmers 8
date: 2026-10-06
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

再回顾 Kleisli 范畴，我们之前提到 Writer 作为 Kleisli 范畴的一个例子，态射是 `a -> Writer b`，恒等态射是 `return :: a -> Writer a`，态射的复合用 `>=>` 定义：

```haskell
type Writer a = (a, String)

return :: a -> Writer a
return x = (x, "")

(>=>) :: (a -> Writer b) -> (b -> Writer c) -> (a -> Writer c)
f >=> g = \x -> let (y, log1) = f x
                    (z, log2) = g y
                in (z, log1 ++ log2)
```

回顾 `fmap` 的类型签名：

```haskell
fmap :: (a -> b) -> (f a -> f b)
```

把 Writer 看成一个 Functor（就像我们看 Maybe 那样），我们期望的 fmap 是：

```haskell
fmap :: (a -> b) -> (Writer a -> Writer b)
```

神奇的事情是 `fmap` 可以通过 Kleisli 范畴的恒等态射和态射复合组合出来：

```haskell
fmap f = id >=> (\x -> return f x)

-- f :: a -> b
-- id :: Writer a -> Writer a
-- \x -> return f x :: Writer a -> Writer b
```

这个有趣的例子或许可以帮助我们窥见 Monad 和 Functor 的关系：Monad 本身就是 Functor（我暂时不保证这个理解是正确的）。

另一个之前提过的函子是 Reader 函子。

```haskell
type Reader r a = r -> a

instance Functor (Reader r) where
  -- fmap :: (a -> b) -> (r -> a) -> (r -> b)
  fmap f g = f . g
```

如果固定的是返回值的类型，那么 `fmap` 的类型签名会变化：

```haskell
type Op r a = a -> r

-- fmap :: (a -> b) -> (a -> r) -> (b -> r)
```

此时发现根据 `fmap` 的前两个参数无法构造出 `b -> r`。我们称之前提到的普通映射对象和态射的函子为协变函子，逆变函子则是：映射对象的方式与协变函子相同，但是在映射态射时，会先反转态射的方向然后再做映射：

```haskell
type Contravariant f where
  contramap :: (b -> a) -> (f a -> f b)

-- Op 就是一个 Contravariant 的实例
instance Contravariant (Op r) where
  contramap f g = g . f
```

综上所述，函数箭头运算符在它的第一个参数上是逆变的，在第二个参数上是协变的。如果目标范畴是 Set，这就叫做副函子（Profunctor）：

$$
C^{op} \times D \rightarrow Set
$$

在 Haskell 中：

```haskell
class Profunctor p where
  dimap :: (a -> b) -> (c -> d) -> p b c -> p a d
  dimap f g = lmap f . rmap g

  lmap :: (a -> b) -> p b c -> p a c
  lmap f = dimap f id

  rmap :: (b -> c) -> p a b -> p a c
  rmap = dimap id
```

`(->)` 可以看作一个副函子的实例：

```haskell
instance Profunctor (->) where
  dimap ab cd bc = cd . bc . ab
  lmap = flip (.)
  rmap = (.)
```

hom 函子是 Profunctor 的一个特例。

#### Challenges

1.

```haskell
import Data.Bifunctor (Bifunctor(..))

data Pair a b = Pair a b
    deriving (Show, Eq)

instance Bifunctor Pair where
    bimap f g (Pair x y) = Pair (f x) (g y)
    first f (Pair x y) = Pair (f x) y
    second g (Pair x y) = Pair x (g y)

{--
(first f . second g) (Pair x y)
= first f (second g (Pair x y))
= first f (Pair x (g y))
= Pair (f x) (g y)

bimap f id (Pair x y)
= Pair (f x) (id y)
= Pair (f x) y

bimap id g (Pair x y)
= Pair (id x) (g y)
= Pair x (g y)
--}
```

2.  

```haskell
import Data.Functor.Const (Const(..))
import Data.Functor.Identity (Identity(..))

type Maybe' a = Either (Const () a) (Identity a)

toMaybe' :: Maybe a -> Maybe' a
toMaybe' Nothing = Left (Const ())
toMaybe' (Just x) = Right (Identity x)

toMaybe :: Maybe' a -> Maybe a
toMaybe (Left (Const ())) = Nothing
toMaybe (Right (Identity x)) = Just x

{--
(toMaybe' . toMaybe) (Left (Const ()))
= toMaybe' (toMaybe (Left (Const ())))
= toMaybe' Nothing
= Left (Const ())

(toMaybe' . toMaybe) (Right (Identity x))
= toMaybe' (toMaybe (Right (Identity x)))
= toMaybe' (Just x)
= Right (Identity x)

(toMaybe . toMaybe') Nothing
= toMaybe (toMaybe' Nothing)
= toMaybe (Left (Const ()))
= Nothing

(toMaybe . toMaybe') (Just x)
= toMaybe (toMaybe' (Just x))
= toMaybe (Right (Identity x))
= Just x
--}
```

3.  
```haskell
data PreList a b = Nil | Cons a b
    deriving (Show, Eq)

instance Bifunctor PreList where
    bimap _ _ Nil = Nil
    bimap f g (Cons x y) = Cons (f x) (g y)
```

4.  
```haskell
data K2  c a b = K2 c
data Fst   a b = Fst a
data Snd   a b = Snd b

instance Bifunctor (K2 c) where
    bimap _ _ (K2 c) = K2 c 

instance Bifunctor Fst where 
    bimap f _ (Fst a) = Fst (f a)

instance Bifunctor Snd where
    bimap _ g (Snd b) = Snd (g b)
```

5. 略

6. std::map 应该被看作一个 Profunctor（因为它类似函数类型）。
