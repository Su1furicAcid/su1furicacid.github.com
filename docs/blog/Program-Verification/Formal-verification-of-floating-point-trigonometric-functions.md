# Formal verification of floating point trigonometric functions

论文 Formal verification of floating point trigonometric functions (FMCAD 2000) 的阅读笔记。

## Outline of the algorithm

对 sin/cos 的计算可以分为两个步骤：

1. 对于任意的实数 $x$ 都可以利用下面的式子把 $x$ 缩减到 $[-\pi/2, \pi/2]$ 的区间内（range reduction）：

$$x=N(\pi/2)+r$$

2. 然后对 $r$ 进行多项式近似：

$$sin(x) = x - \frac{x^3}{3!} + \frac{x^5}{5!} - \frac{x^7}{7!} + \cdots$$

$$cos(x) = 1 - \frac{x^2}{2!} + \frac{x^4}{4!} - \frac{x^6}{6!} + \cdots$$

## HOL floating point theory

论文使用 HOL Light 来进行形式化验证。使用自然数三元组 `fmt` 来表示浮点数格式，`iformat fmt` 表示该格式下的实数集合（不考虑上界），`round fmt rc x` 表示将实数 $x$ 按 `rc` 模式（就近舍入、向偶舍入）舍入到 `fmt` 格式下的结果，`normalizes` 表示一个实数是否在某个格式表示的范围内，`losing` 表示实数在舍入到某个格式时是否发生下溢。

不过为了方便，我会对下面的 HOL theorem 的符号做一些变化。

### The (1+ε) property

一次浮点计算的结果等于精确结果再乘上一个相对误差。比如在 IEEE 754 下，舍入可以表示为 $x(1+\epsilon)$。

在避免下溢和浮点数非平凡的情况下，该定理可以表示为：

```
|- !(losing fmt rc x) /\ !(precision fmt = 0)
    ==> exists e. abs(e) <= mu rc / 2 pow (precision fmt - 1) /\
                round fmt rc x = x * (1 + e)
```

其中 `mu rc` 是舍入模式 `rc` 的舍入误差，`precision fmt` 是格式 `fmt` 的有效位数。`!(losing fmt rc x)` 表示实数 $x$ 在舍入到格式 `fmt` 时不会发生下溢，这个定义相当复杂，可以引入一个充分条件来简化它，即 $x$ 在格式 `fmt` 下是正规的（不超出最小的表示范围）：

```
|- normalizes fmt x ==> !(losing fmt rc x)

where

normalizes fmt x = 
    x = 0 \/
    2 pow (precision fmt - 1) / 2 pow (ulpscale fmt) <= abs x
```

### Cancellation theorems

在浮点数格式恰好表示实数的时候，舍入误差是完全精确的，可以表示为：

```
|- a in iformat fmt ==> round fmt rc a = a
|- !(precision fmt = 0) /\ round fmt rc a = a ==> a in iformat fmt
```

在某些情况下，某些浮点运算可以保持结果精确不会产生舍入误差。论文对两种情况 Sterbenz Lemma 和 TwoSum Lemma 给出了 theorem。

综上所述，在 HOL Light 中对浮点数的定义和某些情况下的性质给出了一些基础定理。

## Verification of range reduction

首先对第一步 range reduction 进行验证。考虑：

$$r = x - N\frac{\pi}{2}$$

因为使用浮点数表示无理数 $\pi$，所以 $\frac{\pi}{2}$ 的表示也会有误差，设这个近似值是 $P=\frac{\pi}{2}+\epsilon$：

$$r' = x - NP$$

计算 $r$ 和 $r'$ 的相对误差：

$$\frac{|r'-r|}{|r|}=\frac{N|\epsilon|}{|r|}$$

为了保证这个相对误差在能够接受的范围内，我们需要首先研究 $r$ 的范围（最小值）。这是一个可以在数学上研究的性质（只考虑浮点数标准，不依赖具体算法实现）。$r$ 的下界可以帮助我们确定 $\epsilon$ 的上界，从而确定 $\pi/2$ 的近似值 $P$ 的精度要求，进而确定用几段浮点数近似 $\pi/2$。

### Approximating $\pi$

首先考虑怎么找到一个高精度的 $\pi$ 的近似值。论文使用了一个算法来计算 $\pi$ 的近似值。考虑可以利用 arctan 来计算 $\pi$，arctan 有如下 Taylor 展开：

$$\arctan(x)=\sum_{m=0}^{\infty}\frac{(-1)^m}{2m+1}x^{2m+1},\quad |x|<1$$

若 $|x|\le 2^{-k}, k>0$，那么把 $\arctan(x)$ 的级数截断到前 $n$ 项后的误差有界：

$$\left|
\arctan(x)-\sum_{m=0}^{n}\frac{(-1)^m}{2m+1}x^{2m+1}
\right|
\le 2^{-(nk-1)}$$

在 HOL Light 中，这个定理可以表示为：

```
|- abs(x) <= inv (2 pow k) /\ ~(x = &0) /\ n > 0
    ==> abs(arctan x - sum (0..n) (\m. ((- &1) pow m / (&2 * m + &1)) * x pow (2 * m + 1))) <= inv (2 pow (n * k - 1))
```

$\pi$ 可以表示为若干 arctan 的线性组合，通过上面的多项式，我们只需要带入多个具体值就可以得到近似结果。为了加速收敛，再利用 Machin-like formula 来计算 $\pi$：

$$\frac{\pi}{4}=6\arctan\left(\frac{1}{8}\right)+2\arctan\left(\frac{1}{57}\right)+\arctan\left(\frac{1}{239}\right)$$

```
|- pi / &4 = &6 * arctan (inv (&8)) + &2 * arctan (inv (&57)) + arctan (inv (&239))
```

也可以使用 BBP 级数来得到更高精度的逼近。

### Bounding the reduced argument

现在回过头来分析 $|r|$ 的范围（下界）。每个双精度浮点数 $x$ 都可以写成：

$$x = \frac{k}{2^e}, \quad 2^{63} \leq k < 2^{64}, \quad e > 0 $$

于是我们关心的是给下面这个量求下界：

$$\left|\frac{k}{2^e}-N\frac{\pi}{2}\right|=\frac{|N|}{2^e}\left|\frac{k}{N}-2^e\frac{\pi}{2}\right|.$$

于是问题变成了，给定 $e$，计算有理数 $\frac{k}{N}$ 和实数 $2^e\frac{\pi}{2}$ 之间的最小距离，也就是无理数的有理逼近问题（丢番图逼近）。

我们只需要考虑那些

$$\frac{k}{2^e}\approx N\frac{\pi}{2}$$

的情形，否则 $x$ 本来就不接近 $\pi/2$ 的某个整数倍。因此，我们只需考虑满足

$$|N|\le \frac{2^{65-e}}{3.14159}$$

的 $N$。

另外，我们只需考虑 $e<64$，因为如果 $e\ge 64$，则 $|x|<1$，因此 $x$ 太小，不可能接近某个非零整数倍的 $\pi/2$。

所以，对于每个

$$e=0,1,\dots,63,$$

我们只需要找出最接近

$$2^e\frac{\pi}{2}$$

的有理数

$$\frac{p}{q},$$

其中分母满足

$$|q|\le \frac{2^{65-e}}{3.14159}.$$

这样，我们就可以通过下式得到

$$\left|\frac{k}{2^e}-N\frac{\pi}{2}\right|$$

的一个相当不错的下界：

$$\frac{2^{63-2e}}{3.1416}
\left|\frac{p}{q}-2^e\frac{\pi}{2}\right|.$$

引理：如果有两个分数 $\frac{p_1}{q_1}$ 和 $\frac{p_2}{q_2}$ 满足：

$$\frac{p_1}{q_1} < x < \frac{p_2}{q_2}$$

并且满足：

$$p_2q_1 - p_1q_2 = 1,$$

那么对于任何分数 $\frac{p}{q}$ 满足 $q \le q_1 + q_2$，都有：

$$\left|\frac{p}{q} - x\right| \ge \frac{1}{q_1 + q_2}$$

这可以在 HOL Light 中表示为：

```
|- p1 / q1 < x /\ x < p2 / q2 /\ p2 * q1 - p1 * q2 = 1
    ==> !p q. q <= q1 + q2 ==> abs (p / q - x) >= inv (q1 + q2)
```

可以通过反复计算两个分数的中项来迭代地产生这种有理数对。即对于$\frac{p_1}{q_1}$ 和 $\frac{p_2}{q_2}$，我们可以计算出它们的中项：

$$\frac{p_1 + p_2}{q_1 + q_2}$$

可以从 0 和 1 开始迭代，直到达到我们感兴趣的精度（Farey 序列/Stern-Broot树）。

对不同的 $e$ 处理之后我们得到输入数接近某个 $\pi/2$ 的整数倍的整体下界：大约是：

$$\frac{113}{2^{76}}$$

### Analyzing the reduced argument computation

上面的分析表示，参数 $r$ 的大小至少大约是 $2^{-69}$，设对 $\pi/2$ 的近似中如果存在误差 $\epsilon$，为了把相对误差控制在大约 $2^{-70}$ 以内，我们需要 $|\epsilon| < 2^{-202}$，为达到这个精度需要用 4 个浮点数的和来近似 $\pi/2$。

Range reduction 的计算依赖于大量特殊技巧来避免或补偿舍入误差。

## Verification of core computation

核心计算实际上就是对前面 range reduction 给出的结果 r+c 进行多项式计算。总体误差主要由三部分组成：

1. 多项式近似误差：通过多项式逼近 sin/cos 产生的误差（参数由 Remez 算法确定）
2. 多项式截断误差：$|p(r+c) - (p(r)+c(1-\frac{r^2}{2}))|$（出于平衡算法效率和精度的考量，不会把 c 放进多项式计算）
3. 实际计算时产生的舍入误差

### Bounding the approximation error

对于多项式近似误差，论文的思路是：利用 Taylor 级数把 sin/cos 近似成截断 Taylor 多项式 $t(x)$（Maclaurin 截断）。若要求总精度为 $\epsilon$，就构造 $t$ 使得在区间上

$$|f(x)-t(x)|\le \frac{\epsilon}{2}$$

然后剩下的问题是把

$$|t(x)-p(x)|$$

也界到 $\frac{\epsilon}{2}$。因为 $t-p$ 本身就是一个有理系数多项式，这一部分就可以用统一方式自动化完成，即一个多项式（以及任何可微函数）的最大值要么出现在区间端点，要么出现在导数为零的点，这是一个相对简单的初等数学问题。

上述工作在 HOL Light 中被形式化为一个通用的 theorem。

## Final correctness theorem

最后的正确性定理可以表示为：

```
|- x in floats Extended /\ abs(Val x) <= &2 pow 64 
    ==> prac (Extended,rc,fz) (fcos rc fz x) (cos(Val x)) (#0.07341 * ulp(rformat Extended) (cos(Val x)))
```

# Conclusion

这篇工作主要讲述了 sin/cos 的近似算法，对算法中的误差给出了详细分析，并在 HOL Light 中进行了形式化验证。