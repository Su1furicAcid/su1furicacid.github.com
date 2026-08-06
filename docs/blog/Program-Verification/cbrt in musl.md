---
title: cbrt in musl
date: 2026-08-05
summary: An explanation of the cube root implementation in the musl C library.
tags:
  - Floating Point
---

# cbrt in musl

[Musl libc 是一个轻量级、快速、安全且符合标准的 C 标准库（libc），旨在替代 GNU C Library (glibc)。它特别适合用于嵌入式系统、资源受限的环境以及需要高度可移植性和静态链接的应用。](https://www.xiexianbin.cn/c/musl-libc/)

Musl 的数学库中提供了丰富的数学函数实现。为了更加精确，这些函数通常使用了多种技巧来处理浮点数带来的舍入误差和多项式带来的近似误差。本文以立方根函数（cube root, cbrt）为例，看 musl 使用了什么样的技巧，这些技巧又给程序验证带来了哪些困难。考虑到完整证明的复杂性，本文仅对 cbrt 的实现进行分析，并不涉及完整的形式证明。

## cbrt 的实现

```c
/* origin: FreeBSD /usr/src/lib/msun/src/s_cbrt.c */
/*
 * ====================================================
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 *
 * Developed at SunPro, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 * ====================================================
 *
 * Optimized by Bruce D. Evans.
 */
/* cbrt(x)
 * Return cube root of x
 */

#include <math.h>
#include <stdint.h>

static const uint32_t
B1 = 715094163, /* B1 = (1023-1023/3-0.03306235651)*2**20 */
B2 = 696219795; /* B2 = (1023-1023/3-54/3-0.03306235651)*2**20 */

/* |1/cbrt(x) - p(x)| < 2**-23.5 (~[-7.93e-8, 7.929e-8]). */
static const double
P0 =  1.87595182427177009643,  /* 0x3ffe03e6, 0x0f61e692 */
P1 = -1.88497979543377169875,  /* 0xbffe28e0, 0x92f02420 */
P2 =  1.621429720105354466140, /* 0x3ff9f160, 0x4a49d6c2 */
P3 = -0.758397934778766047437, /* 0xbfe844cb, 0xbee751d9 */
P4 =  0.145996192886612446982; /* 0x3fc2b000, 0xd4e4edd7 */

double cbrt(double x)
{
	union {double f; uint64_t i;} u = {x};
	double_t r,s,t,w;
	uint32_t hx = u.i>>32 & 0x7fffffff;

	if (hx >= 0x7ff00000)  /* cbrt(NaN,INF) is itself */
		return x+x;

	/*
	 * Rough cbrt to 5 bits:
	 *    cbrt(2**e*(1+m) ~= 2**(e/3)*(1+(e%3+m)/3)
	 * where e is integral and >= 0, m is real and in [0, 1), and "/" and
	 * "%" are integer division and modulus with rounding towards minus
	 * infinity.  The RHS is always >= the LHS and has a maximum relative
	 * error of about 1 in 16.  Adding a bias of -0.03306235651 to the
	 * (e%3+m)/3 term reduces the error to about 1 in 32. With the IEEE
	 * floating point representation, for finite positive normal values,
	 * ordinary integer divison of the value in bits magically gives
	 * almost exactly the RHS of the above provided we first subtract the
	 * exponent bias (1023 for doubles) and later add it back.  We do the
	 * subtraction virtually to keep e >= 0 so that ordinary integer
	 * division rounds towards minus infinity; this is also efficient.
	 */
	if (hx < 0x00100000) { /* zero or subnormal? */
		u.f = x*0x1p54;
		hx = u.i>>32 & 0x7fffffff;
		if (hx == 0)
			return x;  /* cbrt(0) is itself */
		hx = hx/3 + B2;
	} else
		hx = hx/3 + B1;
	u.i &= 1ULL<<63;
	u.i |= (uint64_t)hx << 32;
	t = u.f;

	/*
	 * New cbrt to 23 bits:
	 *    cbrt(x) = t*cbrt(x/t**3) ~= t*P(t**3/x)
	 * where P(r) is a polynomial of degree 4 that approximates 1/cbrt(r)
	 * to within 2**-23.5 when |r - 1| < 1/10.  The rough approximation
	 * has produced t such than |t/cbrt(x) - 1| ~< 1/32, and cubing this
	 * gives us bounds for r = t**3/x.
	 *
	 * Try to optimize for parallel evaluation as in __tanf.c.
	 */
	r = (t*t)*(t/x);
	t = t*((P0+r*(P1+r*P2))+((r*r)*r)*(P3+r*P4));

	/*
	 * Round t away from zero to 23 bits (sloppily except for ensuring that
	 * the result is larger in magnitude than cbrt(x) but not much more than
	 * 2 23-bit ulps larger).  With rounding towards zero, the error bound
	 * would be ~5/6 instead of ~4/6.  With a maximum error of 2 23-bit ulps
	 * in the rounded t, the infinite-precision error in the Newton
	 * approximation barely affects third digit in the final error
	 * 0.667; the error in the rounded t can be up to about 3 23-bit ulps
	 * before the final error is larger than 0.667 ulps.
	 */
	u.f = t;
	u.i = (u.i + 0x80000000) & 0xffffffffc0000000ULL;
	t = u.f;

	/* one step Newton iteration to 53 bits with error < 0.667 ulps */
	s = t*t;         /* t*t is exact */
	r = x/s;         /* error <= 0.5 ulps; |r| < |t| */
	w = t+t;         /* t+t is exact */
	r = (r-t)/(w+r); /* r-t is exact; w+r ~= 3*t */
	t = t+t*r;       /* error <= 0.5 + 0.5/3 + epsilon */
	return t;
}
```

### NaN 和 Inf

```c 
uint32_t hx = u.i>>32 & 0x7fffffff;
if (hx >= 0x7ff00000)  /* cbrt(NaN,INF) is itself */
    return x+x;
```

`hx` 是浮点数 `x` 的高 32 位，掩码 `0x7fffffff` 用于去掉符号位。`0x7ff00000` 是指数全 1、尾数全 0，即 NaN 或 Infinity。

### 第一次逼近

```c
static const uint32_t
B1 = 715094163, /* B1 = (1023-1023/3-0.03306235651)*2**20 */
B2 = 696219795; /* B2 = (1023-1023/3-54/3-0.03306235651)*2**20 */

/*
    * Rough cbrt to 5 bits:
    *    cbrt(2**e*(1+m) ~= 2**(e/3)*(1+(e%3+m)/3)
    * where e is integral and >= 0, m is real and in [0, 1), and "/" and
    * "%" are integer division and modulus with rounding towards minus
    * infinity.  The RHS is always >= the LHS and has a maximum relative
    * error of about 1 in 16.  Adding a bias of -0.03306235651 to the
    * (e%3+m)/3 term reduces the error to about 1 in 32. With the IEEE
    * floating point representation, for finite positive normal values,
    * ordinary integer divison of the value in bits magically gives
    * almost exactly the RHS of the above provided we first subtract the
    * exponent bias (1023 for doubles) and later add it back.  We do the
    * subtraction virtually to keep e >= 0 so that ordinary integer
    * division rounds towards minus infinity; this is also efficient.
    */
if (hx < 0x00100000) { /* zero or subnormal? */
    u.f = x*0x1p54;
    hx = u.i>>32 & 0x7fffffff;
    if (hx == 0)
        return x;  /* cbrt(0) is itself */
    hx = hx/3 + B2;
} else
    hx = hx/3 + B1;
u.i &= 1ULL<<63;
u.i |= (uint64_t)hx << 32;
t = u.f; 
```

`0x00100000` 0x00100000 是最小 normal 数的指数位。小于此值是零或次正规数。

先看正规数对应的分支：

```c
else
    hx = hx/3 + B1;
u.i &= 1ULL<<63;
u.i |= (uint64_t)hx << 32;
t = u.f;
```

后面的 `u.i &= 1ULL<<63;` 是保留符号位，`u.i |= (uint64_t)hx << 32;` 是将处理后的 `hx` 放回高 32 位，低 32 位保持为 0，得到一个结果 `t`。这其实很好理解，比较难理解的是 `hx/3 + B1` 这一步。

对于 64 位浮点数，`hx` 对应的二进制布局为：

```
|符号位 s|11 位指数 E|尾数位的高 20 位 M20| 
```

假设完整的尾数为 $M = M_{20} \times 2^{32} + M_{32}$，其中 $M_{32}$ 是尾数的低 32 位，那么忽略后 32 位尾数和符号位的 `x` 即：

$$
\begin{aligned}
x &= (-1)^s \times 2^{E-1023} \times \left(1 + \frac{M}{2^{52}}\right) \\
   &= (-1)^s \times 2^{E-1023} \times \left(1 + \frac{M_{20} \times 2^{32} + M_{32}}{2^{52}}\right) \\
   &= (-1)^s \times 2^{E-1023} \times \left(1 + \frac{M_{20}}{2^{20}} + \frac{M_{32}}{2^{52}}\right) \\
   &= 2^{E-1023} \times \left(1 + \frac{M_{20}}{2^{20}}\right)
\end{aligned}
$$

设 $e = E - 1023$，$m = \frac{M_{20}}{2^{20}}$，那么有：

$$
x = 2^e \times (1 + m)
$$

那么理想中 `x` 的立方根为：

$$
cbrt(x) = 2^{\frac{e}{3}} \times (1 + m)^{\frac{1}{3}}
$$

但是显然 $e$ 并不一定恰好是 3 的倍数，假设 $e = 3q + r$ 且 $q = \lfloor \frac{e}{3} \rfloor$，那么有：

$$
\frac{e}{3} = \frac{3q + r}{3} = q + \frac{r}{3} = \lfloor \frac{e}{3} \rfloor + \frac{r}{3}
$$

因此：

$$
cbrt(x) = 2^{\lfloor \frac{e}{3} \rfloor} \times ((1 + m) \times 2^r)^{\frac{1}{3}}
$$

整数除法 `hx / 3` 做了什么：

$$
\begin{aligned}
\frac{hx}{3} &= \frac{E \times 2^{20} + M_{20}}{3} \\
             &= \frac{E}{3} \times 2^{20} + \frac{M_{20}}{3} \\
             &= \frac{e + 1023}{3} \times 2^{20} + \frac{M_{20}}{3} \\
             &= \frac{e}{3} \times 2^{20} + \frac{M_{20}}{3} + \frac{1023}{3} \times 2^{20} \\
\end{aligned}
$$

常数 `B1` 被定义为：

$$
B_1 = \left(1023 - \frac{1023}{3} - 0.03306235651\right) \times 2^{20}
$$

因此 `hx/3 + B1` 的结果为：

$$
\begin{aligned}
hx/3 + B_1 &= \frac{e}{3} \times 2^{20} + \frac{M_{20}}{3} + \frac{1023}{3} \times 2^{20} + \left(1023 - \frac{1023}{3} - 0.03306235651\right) \times 2^{20} \\
          &= \frac{e}{3} \times 2^{20} + \frac{M_{20}}{3} + (1023 - 0.03306235651) \times 2^{20} \\
          &= \left(\frac{e}{3} + 1023\right) \times 2^{20} + \frac{M_{20}}{3} - 0.03306235651 \times 2^{20}
\end{aligned}
$$

延续上面对 $e$ 的处理：

$$
hx/3 + B_1 = \left(\lfloor \frac{e}{3} \rfloor + 1023\right) \times 2^{20} + \frac{M_{20}}{3} - 0.03306235651 \times 2^{20} + \frac{r}{3} \times 2^{20}
$$

重新解读这个值的位布局：

新的指数位为：$E' = \lfloor \frac{e}{3} \rfloor + 1023$，即 $e' = E' - 1023 = \lfloor \frac{e}{3} \rfloor$

新的尾数位为：$M_{20}' = \frac{M_{20}}{3} - 0.03306235651 \times 2^{20} + \frac{r}{3} \times 2^{20}$

那么 `t` 的值为：

$$
t = 2^{e'} \times (1 + m')= 2^{\lfloor \frac{e}{3} \rfloor} \times \left(1 + \frac{m + r}{3} - 0.03306235651\right)
$$

这个 `t` 与理想的 `cbrt(x)` 之间的相对误差为：

$$
F_r(m) = \frac{1 + \frac{m + r}{3} - 0.03306235651}{((1 + m) \times 2^r)^{\frac{1}{3}}} - 1
$$

令 $\delta=0.03306235651$，$N(m)=1+\frac{m+r}{3}-\delta$：

$$
F_r(m) + 1 = \frac{N(m)}{((1 + m) \times 2^r)^{\frac{1}{3}}} = N(m) \times ((1 + m) \times 2^r)^{-\frac{1}{3}}
$$

求导，得到：

$$
F_r'(m) = \frac{2^{-r/3}}{9}(1+m)^{-4/3}\left(2m-r+3\delta\right).
$$

令导数为 0，得到极值点：

$$
2m - r + 3\delta = 0 \implies m = \frac{r - 3\delta}{2}
$$

（感慨，没想到又得算这个）

对 r = 0, 1, 2 分别讨论：

r = 2 时，$m = \frac{2 - 3\delta}{2} \approx 0.95040647$，原误差函数的最大值出现在 $m \to 0$：

$$
\begin{aligned}
\lim_{m\to0^+}F_2(m)
&=
\frac{\frac53-\delta}{2^{2/3}}-1\
&\approx0.02910623.
\end{aligned}
$$

同理，r = 1 时：

$$
\begin{aligned}
\lim_{m\to0^+}F_1(m)
&=
\frac{\frac43-\delta}{2^{1/3}}-1\
&\approx0.03202576.
\end{aligned}
$$

r = 0 复杂一些，

形式上的极值点为：$\approx-0.04959353$

它不在 $[0,1)$ 内。

不过，$r=0$ 时还需要考虑指数借位。当：

$$
\frac{m}{3}-\delta<0
$$

也就是：

$$
m<3\delta
$$

时，构造出的浮点数会自然地从指数借 1。

所以实际误差函数是（不再重新推导）：

$$
F_0(m)
=
\begin{cases}
\dfrac{
1+\frac{m}{6}-\frac{\delta}{2}
}{
(1+m)^{1/3}
}-1,
&
0\le m<3\delta,
\\[1.2em]
\dfrac{
1+\frac{m}{3}-\delta
}{
(1+m)^{1/3}
}-1,
&
3\delta\le m<1.
\end{cases}
$$

最小值出现在分段连接点：

$$
m=3\delta.
$$

此时：

$$
F_0(3\delta) = \frac{1}{(1+3\delta)^{1/3}}-1 \approx -0.03103193.
$$

最大值出现在 $m\to1$ 时：

$$
\begin{aligned}
\lim_{m\to1^-}F_0(m)
&=
\frac{\frac43-\delta}{2^{1/3}}-1\
&\approx0.03202576.
\end{aligned}
$$

综上所述，相对误差大约在 0.032 左右。

再回过头来看非规格化数的分支：

```c
if (hx < 0x00100000) { /* zero or subnormal? */
    u.f = x*0x1p54;
    hx = u.i>>32 & 0x7fffffff;
    if (hx == 0)
        return x;  /* cbrt(0) is itself */
    hx = hx/3 + B2;
}
```

`0x00100000` 是最小规格化数的指数位。小于此值是零或次正规数。非规格化数的指数为 0，尾数位不包含前导的 1。因此：

$$
x = 2^{-1022} \times \frac{M_{20}}{2^{20}} = 2^{-1022} \times m
$$

为了和规格化数保持一致的处理，这里没有对非规格化数使用额外的算法，而是把非规格化数乘以 $2^{54}$，使其放大为规格化数，然后再进行第一次逼近。`B2` 的定义就很清楚了：

$$
B_2 = \left(1023 - \frac{1023}{3} - \frac{54}{3} - 0.03306235651\right) \times 2^{20}
$$

### 第二次逼近

```c 
/* |1/cbrt(x) - p(x)| < 2**-23.5 (~[-7.93e-8, 7.929e-8]). */
static const double
P0 =  1.87595182427177009643,  /* 0x3ffe03e6, 0x0f61e692 */
P1 = -1.88497979543377169875,  /* 0xbffe28e0, 0x92f02420 */
P2 =  1.621429720105354466140, /* 0x3ff9f160, 0x4a49d6c2 */
P3 = -0.758397934778766047437, /* 0xbfe844cb, 0xbee751d9 */
P4 =  0.145996192886612446982; /* 0x3fc2b000, 0xd4e4edd7 */
/*
	* New cbrt to 23 bits:
	*    cbrt(x) = t*cbrt(x/t**3) ~= t*P(t**3/x)
	* where P(r) is a polynomial of degree 4 that approximates 1/cbrt(r)
	* to within 2**-23.5 when |r - 1| < 1/10.  The rough approximation
	* has produced t such than |t/cbrt(x) - 1| ~< 1/32, and cubing this
	* gives us bounds for r = t**3/x.
	*
	* Try to optimize for parallel evaluation as in __tanf.c.
	*/
r = (t*t)*(t/x);
t = t*((P0+r*(P1+r*P2))+((r*r)*r)*(P3+r*P4));

/*
	* Round t away from zero to 23 bits (sloppily except for ensuring that
	* the result is larger in magnitude than cbrt(x) but not much more than
	* 2 23-bit ulps larger).  With rounding towards zero, the error bound
	* would be ~5/6 instead of ~4/6.  With a maximum error of 2 23-bit ulps
	* in the rounded t, the infinite-precision error in the Newton
	* approximation barely affects third digit in the final error
	* 0.667; the error in the rounded t can be up to about 3 23-bit ulps
	* before the final error is larger than 0.667 ulps.
	*/
u.f = t;
u.i = (u.i + 0x80000000) & 0xffffffffc0000000ULL;
t = u.f;
```

`t` 是上一步得到的结果，我们知道 `t` 和理想中的 `cbrt(x)` 的相对误差大约在 0.032 左右。假设 $y = cbrt(x), \ y^3 = x$，可以写成 $t = y(1 + \epsilon)$，其中 $\epsilon \approx 0.032$ 是相对误差。

`(t*t)*(t/x)` 计算了 $r = \frac{t^3}{x}$，即：

$$
r = \frac{t^3}{x} = \frac{(y(1 + \epsilon))^3}{x} = \frac{y^3(1 + \epsilon)^3}{x} = (1 + \epsilon)^3.
$$

因此，r 表示的是：当前近似值 t 的立方，相对于正确输入 x 偏大或偏小多少。因为前面已经分析过 t 的误差范围大约在 0.032 左右，所以 r 的范围大约在 0.9 ~ 1.1 之间，即：

$$
|r - 1| < 0.1
$$

既然已经知道了误差 $r = (1 + \epsilon)^3$，那么一个直观的思路是，把上一步的结果 $t$ 乘以 $\frac{1}{\sqrt[3]{r}}$ 就可以得到一个更精确的结果。但直接调用另一个立方根函数显然没有意义，所以代码使用一个四次多项式 $P(r)$ 来近似 $\frac{1}{\sqrt[3]{r}}$，即代码中的：

$$
P(r) = P_0+r(P_1+rP_2)+r^3(P_3+rP_4)
$$

代码之所以没有直接写成普通的多项式计算形式：

```
P0 + r*(P1 + r*(P2 + r*(P3 + r*P4)))
```

而是：

```
P0 + r*(P1 + r*P2) + (r*r)*r*(P3 + r*P4)
```

这么做主要是为了指令级并行，尽可能更好的利用 CPU 性能。

参数 `P0` 到 `P4` 应该是通过 Remez 算法得到的，并非直接对应 Taylor 展开的系数。因为 Taylor 展开在区间 $[0.9, 1.1]$ 上的误差可能不够小，而 Remez 算法可以在指定区间上最小化最大误差，从而得到更好的近似。

多项式和理想的 $\frac{1}{\sqrt[3]{r}}$ 的误差大约在 $2^{-23.5}$。

```c
/*
	* Round t away from zero to 23 bits (sloppily except for ensuring that
	* the result is larger in magnitude than cbrt(x) but not much more than
	* 2 23-bit ulps larger).  With rounding towards zero, the error bound
	* would be ~5/6 instead of ~4/6.  With a maximum error of 2 23-bit ulps
	* in the rounded t, the infinite-precision error in the Newton
	* approximation barely affects third digit in the final error
	* 0.667; the error in the rounded t can be up to about 3 23-bit ulps
	* before the final error is larger than 0.667 ulps.
	*/
u.f = t;
u.i = (u.i + 0x80000000) & 0xffffffffc0000000ULL;
t = u.f; 
```

掩码 `0xffffffffc0000000ULL` 的低 30 位全部为 0，`0x80000000` 是第 31 位为 1，其他位为 0，恰好对应 23-bit 最小步长的两位，所以这一步是更加精化后的 `t` 向绝对值增大的方向做舍入。这是为后面的第三次逼近做准备。

### 第三次逼近

```c
/* one step Newton iteration to 53 bits with error < 0.667 ulps */
s = t*t;         /* t*t is exact */
r = x/s;         /* error <= 0.5 ulps; |r| < |t| */
w = t+t;         /* t+t is exact */
r = (r-t)/(w+r); /* r-t is exact; w+r ~= 3*t */
t = t+t*r;       /* error <= 0.5 + 0.5/3 + epsilon */
return t;
```

这里通过一步 Newton 迭代把最终结果精确到 53 位，误差小于 0.667 ulps。

Newton 迭代指：要求方程 $f(z) = 0$ 的根，给定一个初始近似值 $z_n$，在该点用切线近似函数 $f(z) \approx f(z_n) + f'(z_n)(z - z_n)$，求切线与 $x$ 轴的交点作为下一个近似值 $z_{n+1}$，迭代公式为：

$$
z_{n+1} = z_n - \frac{f(z_n)}{f'(z_n)}
$$

在这里，对于给定的 $x$ 要求其立方根 $y = cbrt(x)$，等价于求方程：

$$
f(y)=y^3-x=0.
$$

取：

$$
f(z)=z^3-x,
$$

则：

$$
f'(z)=3z^2.
$$

代入牛顿公式：

$$
\begin{aligned}
z_{n+1}
&=
z_n-\frac{z_n^3-x}{3z_n^2}
\
&=
z_n-\frac13
\left(
z_n-\frac{x}{z_n^2}
\right)
\
&=
\frac13
\left(
2z_n+\frac{x}{z_n^2}
\right).
\end{aligned}
$$

所以立方根的标准 Newton 迭代是：

$$
z_{n+1}
=
\frac{2z_n+x/z_n^2}{3}
$$

但是 musl 的实现中实际上用的不是这个 Newton 迭代。回到源码实现：

```c
s = t*t;
r = x/s;
w = t+t;
r = (r-t)/(w+r);
t = t+t*r;
```
$$
\begin{aligned}
  s&=t\times t=t^2
  \\
  r&=\frac{x}{s}=\frac{x}{t^2}
  \\
  w&=t+t=2t
  \\
  r&=\frac{r-t}{w+r}
  =\frac{\frac{x}{t^2}-t}{2t+\frac{x}{t^2}}
  \\
  t_{\mathrm{new}}
  &=t+t\times r
  \\
  &=t+t\frac{\frac{x}{t^2}-t}{2t+\frac{x}{t^2}}
  \\
  &=t\left(
  1+\frac{\frac{x}{t^2}-t}{2t+\frac{x}{t^2}}
  \right)
  \\
  &=t\left(
  \frac{
  2t+\frac{x}{t^2}
  +\frac{x}{t^2}-t
  }{
  2t+\frac{x}{t^2}
  }
  \right)
  \\
  &=t\left(
  \frac{
  t+\frac{2x}{t^2}
  }{
  2t+\frac{x}{t^2}
  }
  \right)
  \\
  &=t\left(
  \frac{
  t^3+2x
  }{
  2t^3+x
  }
  \right)
  \\
  &=
  t\frac{t^3+2x}{2t^3+x}
\end{aligned}
$$

这个公式实际上来自于 Halley 迭代，Halley 方法的一般公式为：

$$
z_{n+1} = z_n - \frac{2f(z_n)f'(z_n)}{2(f'(z_n))^2 - f(z_n)f''(z_n)}
$$

对于：

$$
f(z)=z^3-x,
$$

有：

$$
f'(z)=3z^2 \\
f''(z)=6z
$$

带入上式：

$$
z_{n+1} = z_n - \frac{2(z_n^3-x)(3z_n^2)}{2(3z_n^2)^2-(z_n^3-x)(6z_n)}
$$

化简分子：

$$
2(z_n^3-x)(3z_n^2)=6z_n^2(z_n^3-x).
$$

化简分母：

$$
\begin{aligned}
2(3z_n^2)^2-(z_n^3-x)(6z_n)
&=
18z_n^4-6z_n(z_n^3-x)
\\
&=
18z_n^4-6z_n^4+6z_nx
\\
&=
12z_n^4+6z_nx
\\
&=
6z_n(2z_n^3+x).
\end{aligned}
$$

因此：

$$
\begin{aligned}
z_{n+1}
&=
z_n-
\frac{
6z_n^2(z_n^3-x)
}{
6z_n(2z_n^3+x)
}
\\
&=
z_n-
z_n\frac{z_n^3-x}{2z_n^3+x}
\\
&=
z_n
\frac{2z_n^3+x-z_n^3+x}{2z_n^3+x}
\\
&=
z_n
\frac{z_n^3+2x}{2z_n^3+x}.
\end{aligned}
$$

这正好对应 musl 的实现。使用一次 Halley 迭代比使用一次 Newton 迭代更快收敛，误差更小（Halley 迭代的误差近似于 $\epsilon_{new} \approx \epsilon_{old}^3$，相比之下 Newton 迭代的误差近似于 $\epsilon_{new} \approx \epsilon_{old}^2$，因此 Halley 迭代才能把 23-bit 的精度提升到 53-bit）。

此外，`s = t*t` 和 `w = t+t` 之所以是精确的，是因为之前已经把 `t` 的后 30 位清零了，因此 `t` 的尾数位只有前 23 位有效，乘法和加法不会产生舍入误差。

## CORE-MATH 中的 cbrt

[CORE-MATH](https://core-math.gitlabpages.inria.fr/) 给出了一个经过验证的 cbrt 实现。通过手工证明，cbrt 保证返回值是精确立方根经过一次正确舍入后的结果。