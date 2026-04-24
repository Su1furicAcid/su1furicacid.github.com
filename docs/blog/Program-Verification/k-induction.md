---
title: k-induction
date: 2026-04-22
summary: Introduction to k-induction in program verification.
tags:
  - Model Checking
  - Program Verification
---

本文首先阐述有界模型检查（Bounded Model Checking）和 k-induction 的基本概念，然后介绍使用了 k-induction 的工具 CPAChecker、ESBMC 和 2LS。 

# Bounded Model Checking

模型检查的基本概念是将程序看作一个状态迁移系统 $M$，验证其是否满足某个性质 $\phi$。

有界模型检查（Bounded Model Checking, BMC）是一种基于 SAT/SMT 求解器的模型检查方法。它通过检查系统在 $k$ 步内是否存在违反性质 $\phi$ 的反例来验证系统的正确性。BMC 的核心思想是将模型检查问题转化为一个可满足性问题：
$$
\exists s_0, s_1, \ldots, s_k: I(s_0) \land T(s_0, s_1) \land T(s_1, s_2) \land \ldots \land T(s_{k-1}, s_k) \land \neg \phi(s_k)
$$

其中 $I(s_0)$ 表示初始状态，$T(s_i, s_{i+1})$ 表示状态转移关系，$\neg \phi(s_k)$ 表示在第 $k$ 步违反性质 $\phi$。如果上述公式可满足，则存在一个长度为 $k$ 的反例路径；如果不可满足，则在 $k$ 步内没有反例。

BMC 是一种下近似方法，适用于寻找反例，但不能证明系统的正确性。比如程序：

```c
x = 0;
y = 0;
while (x < 10) {
  x++;
  y++;
}
assert(y > 10);
```

对其进行 $k=1$ 的展开及 SSA 转换后得到：

```c
x_0 = 0;
y_0 = 0;
// g_0 <=> x_0 < 10
x_1 = x_0 + 1;
y_1 = y_0 + 1;
// g_1 <=> x_1 >= 10
x_2 = ite(g_0, x_1, x_0);
y_2 = ite(g_0, y_1, y_0);
assert(y_2 > 10);
```

将上述 SSA 形式的程序转化为 SMT 公式，得到：

$$
(x_0 = 0) \land \\
(y_0 = 0) \land \\ 
(g_0 \leftrightarrow x_0 < 10) \land \\
(x_1 = x_0 + 1) \land \\
(y_1 = y_0 + 1) \land \\
(x_2 = \text{ite}(g_0, x_1, x_0)) \land \\
(y_2 = \text{ite}(g_0, y_1, y_0)) \land \\
\neg (y_2 > 10)
$$

把这个公式交给 SMT 求解，得到 SAT，说明不存在长度为 1 的反例路径。假设我们预设的 $k < 10$，那么 BMC 就无法找到反例路径，但也不能给出程序正确的结论，因此程序在 10 步后会违反断言。

k-induction 扩展了 BMC 的能力，通过增加一个归纳步骤来证明程序的正确性。

# k-induction

k-induction 包含两个步骤：基步骤和归纳步骤。

基步骤与 BMC 类似，检查程序从初始状态 $s_0$ 出发，在 $k$ 步内是否满足性质 $\phi$。归纳步骤的目标是证明程序从任意的状态 $s_n$ 出发，在 $k$ 步内满足性质 $\phi$ 的前提下，第 下一步 $s_{n+k}$ 也满足性质 $\phi$。

形式化地，定义：

$$
P(k) \;:=\; \forall s_0,\dots,s_k.\;
\Bigl(
\bigwedge_{i=0}^{k-1}T(s_i,s_{i+1})
\Bigr)
\;\Rightarrow\;
\phi(s_i)
$$

Base case：

$$
I(0) \land P(0) \land P(1) \land \cdots \land P(k-1)
$$

Induction step：

$$
\forall n.\;
\Bigl(P(n) \land P(n+1) \land \cdots \land P(n+k-1)\Bigr)
\;\Rightarrow\;
P(n+k)
$$ 

归纳步骤的前提不包含 $I(0)$，这导致我们需要模拟任意的状态 $s_n$。一种方法是把所有的变量都提升为自由变量，表示为 $havoc(x)$。例如对于程序：

```c
x = 1;
y = 1;
while (x < 10) {
  x++;
  y++;
}
assert(x == y);
```

初始情况下，$k=1$，经过一次展开和 SSA 转换后得到：

```c
x_0 = 1;
y_0 = 1;
assert(x_0 == y_0);
```

将上述 SSA 形式的程序转化为 SMT 公式，得到：

$$
(x_0 = 1) \land \\
(y_0 = 1) \land \\
\neg (x_0 = y_0)
$$

把这个公式交给 SMT 求解，得到 UNSAT，说明不存在长度为 1 的反例路径。对于归纳步骤（$k=1$），我们需要证明从任意状态出发，只要当前状态满足性质，执行一步后性质仍成立：

```c
havoc(x_0);
havoc(y_0);
assume(x_0 == y_0);      // 归纳假设
// g_0 <=> x_0 < 10
x_1 = ite(g_0, x_0 + 1, x_0);
y_1 = ite(g_0, y_0 + 1, y_0);
assert(x_1 == y_1);      // 需要证明
```

对应地，将归纳步骤转成 SMT 可满足性检查：

$$
(x_0 = y_0) \land \\
(g_0 \leftrightarrow x_0 < 10) \land \\
(x_1 = \text{ite}(g_0, x_0 + 1, x_0)) \land \\
(y_1 = \text{ite}(g_0, y_0 + 1, y_0)) \land \\
\neg (x_1 = y_1)
$$

该公式 UNSAT，说明归纳步骤成立。因此该程序确实是正确的。

上述例子通过 $k=1$ 的基步骤和利用了 $havoc$ 的归纳步骤就证明了程序的正确性，主要原因是需要验证的正确性目标就是该程序的循环不变式。

如果对于更加复杂的程序或更加复杂的性质，需要逐步增大 $k$ 的值，并尝试合成一个循环不变式辅助归纳步骤的证明。循环不变式的合成可以利用一个预静态分析完成，比如 ESBMC 的 interval analysis，也可以在 k-induction 的过程中动态地合成，比如 2LS 的 template-based invariant synthesis。

# CPAChecker

CPAChecker 的整体架构如图：

[![peWrAeA.md.png](https://s41.ax1x.com/2026/04/24/peWrAeA.md.png)](https://imgchr.com/i/peWrAeA)

CPAChecker 在 _A Unifying View on SMT-Based Software Verification_ 中给出了在 Configuarble Program Analysis 中进行 k-induction 的算法。

[![peWrtYV.png](https://s41.ax1x.com/2026/04/24/peWrtYV.png)](https://imgchr.com/i/peWrtYV)

以下面的程序为例：

[![peWrgfK.png](https://s41.ax1x.com/2026/04/24/peWrgfK.png)](https://imgchr.com/i/peWrgfK)

base：

[![peWr7kt.png](https://s41.ax1x.com/2026/04/24/peWr7kt.png)](https://imgchr.com/i/peWr7kt)

induction：

[![peWrO1S.png](https://s41.ax1x.com/2026/04/24/peWrO1S.png)](https://imgchr.com/i/peWrO1S)

# ESBMC v6.0

在 ESBMC v6.0 的论文中使用了不太相同的记号，不过目标相同：

$$
B(k)
= I(s_1)\ \land\ \bigwedge_{i=1}^{k-1} T(s_i,s_{i+1})\ \land\ \bigvee_{i=1}^{k}\neg \varphi(s_i).
$$

$$F(k)
= I(s_1)\ \land\ \bigwedge_{i=1}^{k-1}T(s_i,s_{i+1})\ \land\ \neg \psi(s_k).
$$

$$S(k)
= \exists n\in \mathbb{N}^+.\ 
\Big(
\bigwedge_{i=n}^{n+k-1}\big(\varphi(s_i)\ \land\ T'(s_i,s_{i+1})\big)
\Big)\ \land\ \neg \varphi(s_{n+k}).
$$

$$kind(P,k)=
\begin{cases}
\text{$P$ 有 bug}, & \text{若 } B(k)\ \text{可满足};\\[4pt]
\text{$P$ 正确}, & \text{若 } B(k)\ \lor\ \big(F(k)\land S(k)\big)\ \text{不可满足};\\[4pt]
kind(P,k+1), & \text{否则}.
\end{cases}$$

ESBMC v6.0 提出使用区间分析加强不变式合成。在 k-induction 之前进行静态分析，过近似地估计变量的可能取值范围，实现一种 rectangular invariant 生成（例如 $a \leq x \leq b$）。

$S'(k)=\exists n.\ \underbrace{\phi(s_n)}_{\text{不变式}}
\land \bigwedge_{i=n}^{n+k-1}\big(\varphi(s_i)\land T'(s_i,s_{i+1})\big)
\land \neg\varphi(s_{n+k})$

# 2LS for Program Analysis

2LS 的核心算法是 k-induction k-invariant (kIkI) 算法。算法流程如图：

[![peWylan.png](https://s41.ax1x.com/2026/04/24/peWylan.png)](https://imgchr.com/i/peWylan)

和 ESBMC 的思路不同，2LS 在 k-induction 的过程中合成 template-based invariant。

$KInv(x_k)$ 的形式是 $\tau(x, \delta)$，$\tau$ 对应模板表达式，$x$ 对应所有变量，$\delta$ 对应表达式中的参数。k-invariant 定义为：

$$\tau^{[k]}(\delta)=\bigwedge_{i \in [0,k-1]}\tau(x_i,\delta)$$

k-invariant 的合成基于抽象解释。

具体化函数 $\gamma(d)=\{\,s\mid \tau(s,d)=true\,\}$，抽象函数 $\alpha(s)=\min\{\,d\mid \tau(s,d)=true\,\}$

定义路径条件：

$$T[k]=\bigwedge_{i \in [0,k-1]}Trans(x_i,x_{i+1})$$

类似 CEGAR 的思路，从 $d=\bot$ 开始，迭代求解：

$$\tau^{[k]}(d) \land T[k] \land \neg \tau(x_k,d)$$

如果上面的公式 SAT，说明找到了一个反例，那么利用反例的结果增强原先的抽象域，表示为用 $d_{old} \gets d_{old} \sqcup d_{neg}$

[![peW2aSx.png](https://s41.ax1x.com/2026/04/24/peW2aSx.png)](https://imgchr.com/i/peW2aSx)

# Lam4Inv

题外话：

_LLM Meets Bounded Model Checking: Neuro-symbolic Loop Invariant Inference_
