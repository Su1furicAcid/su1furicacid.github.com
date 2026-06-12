---
title: Verification of function scalbn
date: 2026-05-17
summary: Using Frama-C Eva/WP to verify the correctness of the scalbn function in the musl math library.
tags:
  - Program Verification
  - Floating Point Arithmetic
  - Bitwise Operation
---

本文尝试利用 Frama-C Eva/WP 对 musl 数学库中的函数 scalbn 进行验证，主要验证其功能正确性。

# Verification of function scalbn

## Function scalbn

函数 scalbn 的实现如下：

```c
#include <math.h>
#include <stdint.h>

double scalbn(double x, int n)
{
	union {double f; uint64_t i;} u;
	double_t y = x;

	if (n > 1023) {
		y *= 0x1p1023;
		n -= 1023;
		if (n > 1023) {
			y *= 0x1p1023;
			n -= 1023;
			if (n > 1023)
				n = 1023;
		}
	} else if (n < -1022) {
		/* make sure final n < -53 to avoid double
		   rounding in the subnormal range */
		y *= 0x1p-1022 * 0x1p53;
		n += 1022 - 53;
		if (n < -1022) {
			y *= 0x1p-1022 * 0x1p53;
			n += 1022 - 53;
			if (n < -1022)
				n = -1022;
		}
	}
	u.i = (uint64_t)(0x3ff+n)<<52;
	x = y * u.f;
	return x;
}
```

注意到相比于 `return (double)(x * (1L << n));`，该函数主要做了两件事情：

1. 当参数 `n` 过大时对 `n` 进行拆分：`n` 过大时会导致立即数 `1L << n` 产生溢出，但是参数 `x` 可能很小，最终的结果 `x * (1L << n)` 并不会溢出。

2. 当参数 `n` 小于 0 时，如果 `n` 恰好在 `-1022` 附近，把 `n` 直接拆分成 `n1 = -1022` 和 `n2 = n - n1`，当 `x * (1L << n1)` 从 normal 进入到 subnormal 时，会产生一次舍入误差，那么 `x * (1L << n2)` 从一个 subnormal 到另一个 subnormal 时还会产生一次舍入误差，最终的结果会产生两次舍入误差，导致结果不准确。为了避免这种情况，保证拆分出的参数 `n2 < -53`，使得第一次的舍入误差不会影响第二次的计算。

综上所述，函数 scalbn 的证明目标主要分为：

1. 当实数结果没超出 double 的表示范围时，函数 scalbn 的结果与进行一次舍入的实数结果相同。

2. 当实数结果超出 double 的表示范围时（上溢或者下溢），函数 scalbn 的结果为 ±∞ 或 ±0。

3. 一次舍入产生的误差在 0.5 ulp 之内。

## Verification with Frama-C Eva/WP

按照 ACSL，我们期望函数 scalbn 满足以下规范：

```c
/*@
  requires \is_finite(x);
  requires !\is_NaN(x);
  terminates \true;
  exits \false;
  ensures \is_finite((double)(x * \pow(2.0, n))) ==> \result == (double)(x * \pow(2.0, n)));
  ensures \is_infinite((double)(x * \pow(2.0, n))) ==> \is_infinite(\result));
  ensures \exact(\result) - x * \pow(2.0, n) <= 0.5 * ulp;
*/
double scalbn(double x, int n);
```

然而，使用 Frama-C WP 来验证该函数的正确性时，我们遇到了以下问题：

1. WP 无法处理形如 `0x1p1023` 的浮点字面量。

2. WP 无法 soundly 处理 `union`，也就无法处理 `union {double f; uint64_t i;} u;` 这样的类型双关。

3. WP 无法处理 `\exact`。

4. 函数 `\pow` 是定义在实数域上的，但是中间结果显然都是用 double 表示的。如果在程序中间插入一些断言来说明中间结果的取值引导 WP 证明，我们无法处理 scalbn 中“只会引入一次舍入误差”的算法设计，最后得到的结论是 `\result = (double)(x * \pow(2.0, n1) * (double)(x * \pow(2.0, n2)))`，而不是 `\result = (double)(x * \pow(2.0, n))`。

5. Qed 和 z3 在处理浮点字面量和函数 `\pow` 之间的关系时会盲目把 `\pow` 展开，导致证明失败。

为了应对上面的问题，我们需要对源码做一些简单的修改，这些修改保证不破坏原始程序语义:

1. 用一个抽象函数 `scalbn_mul_pow2` 来代替 `y * u.f`，并且添加规约来说明函数行为。

TBD...