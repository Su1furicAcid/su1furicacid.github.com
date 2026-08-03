---
title: Quantifying infrastructure noise in agentic coding evals
date: 2026-08-13
summary: Anthropic 原文 "Quantifying infrastructure noise in agentic coding evals" 的中英双语对照翻译，探讨基础设施配置如何影响智能体编码评估的结果。
tags:
  - Agent Design
  - Evaluation
---

# Quantifying infrastructure noise in agentic coding evals

> 原文链接：[Quantifying infrastructure noise in agentic coding evals](https://www.anthropic.com/engineering/infrastructure-noise) · Published Feb 05, 2026

<!-- Bilingual content begins below -->

<Bilingual>
<template #en>

<mark>Infrastructure configuration can swing agentic coding benchmarks by several percentage points — sometimes more than the leaderboard gap between top models.</mark>

</template>
<template #zh>

<mark>基础设施配置可以让智能体编码基准测试的分数波动好几个百分点——有时甚至超过排行榜上顶级模型之间的差距。</mark>

</template>
</Bilingual>

<Bilingual>
<template #en>

Agentic coding benchmarks like SWE-bench and Terminal-Bench are commonly used to compare the software engineering capabilities of frontier models — with top spots on leaderboards often separated by just a few percentage points. These scores are often treated as precise measurements of relative model capability and increasingly inform decisions about which models to deploy. However, we've found that infrastructure configuration alone can produce differences that exceed those margins. In internal experiments, the gap between the most- and least-resourced setups on Terminal-Bench 2.0 was 6 percentage points (p < 0.01).

</template>
<template #zh>

SWE-bench 和 Terminal-Bench 等智能体编码基准常被用来比较前沿模型的软件工程能力——排行榜上的顶尖名次往往只差几个百分点。这些分数常被视为模型相对能力的精确测量，并日益影响部署哪个模型的决策。然而，我们发现仅基础设施配置就能产生超出这些差距的差异。在内部实验中，Terminal-Bench 2.0 上资源最充足和最匮乏的配置之间相差 6 个百分点（p < 0.01）。

</template>
</Bilingual>

<Bilingual>
<template #en>

Static benchmarks score a model's output directly — the runtime environment doesn't factor into the result. Agentic coding evals are different: models are given a full environment where they write programs, run tests, install dependencies, and iterate over multiple turns. The runtime is no longer a passive container, but an integral component of the problem-solving process. Two agents with different resource budgets and time limits aren't taking the same test.

</template>
<template #zh>

静态基准直接对模型的输出评分——运行时环境不影响结果。智能体编码评估则不同：模型获得一个完整的环境，在其中编写程序、运行测试、安装依赖，并经过多个回合迭代。运行时不再是被动的容器，而是问题求解过程的一个有机组成部分。两个资源预算和时间限制不同的智能体，参加的并不是同一场考试。

</template>
</Bilingual>

<Bilingual>
<template #en>

Eval developers have begun accounting for this. Terminal-Bench 2.0, for instance, specifies recommended CPU and RAM on a per-task basis in their latest 2.0 release. However, specifying resources isn't the same as enforcing them consistently. Moreover, we discovered that enforcement methodology can change what the benchmark ends up actually measuring.

</template>
<template #zh>

评估开发者已经开始考虑这一点。例如，Terminal-Bench 2.0 在最新的 2.0 版本中按任务指定了推荐的 CPU 和 RAM。然而，指定资源并不等于一致地执行这些限制。此外，我们发现执行方法本身可以改变基准最终实际测量的东西。

</template>
</Bilingual>

## How we got here

<Bilingual>
<template #en>

We run Terminal-Bench 2.0 on a Google Kubernetes Engine cluster. While calibrating the setup, we noticed our scores didn't match the benchmark's official leaderboard, and infra error rates were surprisingly high: as many as 6% of tasks were failing because of pod errors, most of which were unrelated to the model's ability to solve the tasks.

</template>
<template #zh>

我们在 Google Kubernetes Engine 集群上运行 Terminal-Bench 2.0。在校准设置时，我们注意到我们的分数与基准的官方排行榜不匹配，而且基础设施错误率高得惊人：多达 6% 的任务因 pod 错误而失败，其中大多数与模型解决任务的能力无关。

</template>
</Bilingual>

<Bilingual>
<template #en>

The discrepancy in scores came down to enforcement. Our Kubernetes implementation treated the per-task resource specs as both a floor and a hard ceiling: each container was guaranteed the specified resources but killed the moment it exceeded them. <mark>Container runtimes enforce resources via two separate parameters: a guaranteed allocation — the resources reserved up front — and a hard limit at which the container is killed. When these are set to the same value, there's zero headroom for transient spikes: a momentary memory fluctuation can OOM-kill a container that would otherwise have succeeded.</mark> To account for this, Terminal-Bench's leaderboard uses a different sandboxing provider, whose implementation is more lenient, allowing temporary overallocation without terminating the container in order to favor infrastructural stability.

</template>
<template #zh>

分数上的差异归结于执行方式。我们的 Kubernetes 实现将每任务资源规格同时视为下限和硬性上限：每个容器保证获得指定资源，但一旦超出就会被立即杀死。<mark>容器运行时通过两个独立参数来执行资源限制：保证分配量——预先预留的资源——以及杀死容器的硬限制。当两者设为相同值时，瞬时的资源峰值没有任何余量：一次短暂的内存波动就可以 OOM 杀死一个本应成功的容器。</mark>为了解决这个问题，Terminal-Bench 的排行榜使用了不同的沙箱提供商，其实现更为宽松，允许临时超额分配而不终止容器，以优先保证基础设施的稳定性。

</template>
</Bilingual>

<Bilingual>
<template #en>

This finding raised a larger question: how much does resource configuration impact evaluation scores?

</template>
<template #zh>

这一发现引出了一个更大的问题：资源配置对评估分数的影响有多大？

</template>
</Bilingual>

<Bilingual>
<template #en>

To quantify the effect of the scaffold, we ran Terminal-Bench 2.0 across six resource configurations, from strict enforcement of the per-task specs (1x), having them act as both floor and ceiling, to completely uncapped. Everything else stayed constant: same Claude model, same harness, same task set.

</template>
<template #zh>

为了量化脚手架的影响，我们在六种资源配置下运行了 Terminal-Bench 2.0，从严格执行每任务规格（1x，即同时作为下限和上限）到完全不限资源。其他一切保持不变：相同的 Claude 模型、相同的框架、相同的任务集。

</template>
</Bilingual>

<Bilingual>
<template #en>

In our experiments, success rates increased with resource headroom. This was primarily driven by infra error rates dropping monotonically at each step, going from 5.8% at strict enforcement to 0.5% when uncapped. The drop between strict enforcement to 3x headroom (5.8% to 2.1%) was significant at p < 0.001. With more headroom, fewer containers get killed for exceeding their allocation.

</template>
<template #zh>

在我们的实验中，成功率随资源余量增加而上升。这主要是由基础设施错误率在每个步骤单调下降驱动的，从严格执行时的 5.8% 降至不限资源时的 0.5%。从严格执行到 3x 余量的下降（5.8% 到 2.1%）在 p < 0.001 水平上显著。余量越大，因超出分配而被杀死的容器就越少。

</template>
</Bilingual>

<Bilingual>
<template #en>

From 1x through 3x, success scores fluctuate within the margins of noise (p=0.40). Most of the tasks that were crashing at 1x would have failed regardless — which is something that we observed in the data. The agent explores, hits a resource wall, and gets preempted, but it was never on a path to a correct solution.

</template>
<template #zh>

从 1x 到 3x，成功分数在噪声范围内波动（p=0.40）。大多数在 1x 时崩溃的任务无论如何都会失败——这是我们在数据中观察到的。智能体在探索中撞上资源墙并被抢占，但它从未走在通向正确解的路径上。

</template>
</Bilingual>

<Bilingual>
<template #en>

<mark>Starting around 3x, however, this trend changes: success rates climb faster than infra errors decline.</mark>

</template>
<template #zh>

<mark>然而，从 3x 左右开始，这一趋势发生了变化：成功率的攀升速度超过了基础设施错误率的下降速度。</mark>

</template>
</Bilingual>

<Bilingual>
<template #en>

Between 3x to uncapped, infra errors drop an additional 1.6 percentage points, while success jumps almost 4 percentage points. The extra resources enable the agent to try approaches that only work with generous allocations, such as pulling in large dependencies, spawning expensive subprocesses, and running memory-intensive test suites. At uncapped resources, the total lift over 1x is +6 percentage points (p < 0.01). At the margins, tasks like `rstan-to-pystan` and `compile-compcert` significantly improve their success rates when getting memory headroom.

</template>
<template #zh>

从 3x 到不限资源，基础设施错误率额外下降 1.6 个百分点，而成功率则跳升了近 4 个百分点。额外的资源使智能体能够尝试那些只有在充足分配下才行得通的方案，比如拉取大型依赖、生成高开销的子进程，以及运行内存密集型的测试套件。在不限资源的情况下，相对于 1x 的总提升为 +6 个百分点（p < 0.01）。在边际上，`rstan-to-pystan` 和 `compile-compcert` 等任务在获得内存余量时成功率显著提升。

</template>
</Bilingual>

## How this affects measurement

<Bilingual>
<template #en>

Up to roughly 3x Terminal-Bench specs, the additional resources fix infrastructure reliability problems, namely transient resource spikes. The sandboxing provider used by the Terminal-Bench maintainers is implicitly doing this behind the scenes; the eval gets more stable without getting easier.

</template>
<template #zh>

在约 3 倍 Terminal-Bench 规格之前，额外的资源修复的是基础设施可靠性问题，即瞬时的资源峰值。Terminal-Bench 维护者使用的沙箱提供商在幕后隐式地做了这件事；评估变得更稳定了，但并没有变得更简单。

</template>
</Bilingual>

<Bilingual>
<template #en>

<mark>Above the 3x mark, however, additional resources start actively helping the agent solve problems it couldn't solve before, which shows that limits can actually change what the eval measures.</mark> Tight limits inadvertently reward very efficient strategies, while generous limits are more forgiving and reward agents that can better exploit all available resources.

</template>
<template #zh>

<mark>然而，超过 3 倍之后，额外的资源开始主动帮助智能体解决之前无法解决的问题，这表明限制实际上可以改变评估测量的内容。</mark>严格的限制无意中奖励了非常高效的策略，而宽松的限制更宽容，奖励那些能更好地利用所有可用资源的智能体。

</template>
</Bilingual>

<Bilingual>
<template #en>

An agent that writes lean, efficient code very fast will do well under tight constraints. An agent that brute-forces solutions with heavyweight tools will do well under generous ones. Both are legitimate things to test, but collapsing them into a single score without specifying the resource configuration makes the differences — and real-world generalizability — hard to interpret.

</template>
<template #zh>

一个快速编写精简、高效代码的智能体在严格约束下表现良好。一个用重量级工具蛮力求解的智能体在宽松约束下表现良好。两者都是合理的测试对象，但如果不指定资源配置就将它们折叠成一个单一分数，会使差异——以及现实世界的泛化能力——难以解读。

</template>
</Bilingual>

<Bilingual>
<template #en>

On `bn-fit-modify`, a Terminal-Bench task requiring Bayesian network fitting, some models' first move is to install the standard Python data science stack: `pandas`, `networkx`, `scikit-learn,` and all their toolchain. Under generous limits, this works. Under tight ones, the pod runs out of memory during installation, before the agent writes a single line of solution code. A leaner strategy exists (implementing the math from scratch using only the standard library), and some models do default to it. Others don't. Different models have different default approaches, and the resource configuration determines which of those approaches happen to succeed.

</template>
<template #zh>

在 `bn-fit-modify` 这个需要贝叶斯网络拟合的 Terminal-Bench 任务上，一些模型的第一步是安装标准 Python 数据科学栈：`pandas`、`networkx`、`scikit-learn` 以及它们所有的工具链。在宽松限制下，这行得通。在严格限制下，pod 在安装过程中就耗尽了内存，此时智能体还没写一行解决方案代码。存在一种更精简的策略（仅使用标准库从零实现数学计算），一些模型确实默认采用它。另一些则不会。不同模型有不同的默认方案，而资源配置决定了这些方案中哪些恰好能成功。

</template>
</Bilingual>

<Bilingual>
<template #en>

We replicated the core finding across different Anthropic models. The direction of the effect was consistent, while the magnitude varied. The same trends seem to hold on models other than Claude, but we haven't rigorously tested them.

</template>
<template #zh>

我们在不同的 Anthropic 模型上复现了核心发现。效应方向一致，但幅度有所不同。同样的趋势似乎也适用于 Claude 以外的模型，但我们尚未对其进行严格测试。

</template>
</Bilingual>

<Bilingual>
<template #en>

We also tested whether this pattern holds on evals outside Terminal-Bench by running a crossover experiment on SWE-bench. We varied the total available RAM up to 5x the baseline across 227 problems with 10 samples each. The same effect held, though the magnitude was smaller: Scores again increased monotonically with RAM, but were only 1.54 percentage points higher at 5x than 1x. SWE-bench tasks are less resource-intensive, so a smaller effect is expected, but it shows resource allocation isn't neutral there either.

</template>
<template #zh>

我们还通过在 SWE-bench 上进行交叉实验，测试了这种模式是否在 Terminal-Bench 之外的评估中也成立。我们在 227 个问题上将总可用 RAM 在最高 5 倍基线范围内变化，每个问题 10 个样本。同样的效应成立，但幅度较小：分数同样随 RAM 单调递增，但 5x 时仅比 1x 高 1.54 个百分点。SWE-bench 任务对资源的需求较低，因此效应较小是预期的，但这表明资源分配在那里也不是中性的。

</template>
</Bilingual>

## Other sources of variance

<Bilingual>
<template #en>

Resource allocation isn't the only hidden variable. In certain configurations, time limits too start playing a role.

</template>
<template #zh>

资源分配不是唯一的隐藏变量。在某些配置中，时间限制也开始发挥作用。

</template>
</Bilingual>

<Bilingual>
<template #en>

<mark>In principle, every element of the evaluation setup can influence the final score, from the cluster health to the hardware specs, from the concurrency level to even egress bandwidth.</mark> Agentic evals are end-to-end system tests by construction, and any component of that system can act as a confounder. We have observed anecdotally, for instance, that pass rates fluctuate with time of day, likely because API latency varies with traffic patterns and incidents. We have not formally quantified this effect, but it illustrates a larger point: the boundary between "model capability" and "infrastructure behavior" is blurrier than a single benchmark score suggests. A model provider can shield its eval infrastructure from this by dedicating hardware, but external evaluators can't easily do the same.

</template>
<template #zh>

<mark>原则上，评估设置的每个元素都可以影响最终分数，从集群健康状况到硬件规格，从并发级别到甚至出口带宽。</mark>智能体评估从构造上就是端到端的系统测试，该系统的任何组件都可能成为混淆因素。例如，我们观察到通过率会随一天中的时间波动，这可能是因为 API 延迟随流量模式和事件而变化。我们没有正式量化这一效应，但它说明了一个更大的问题："模型能力"和"基础设施行为"之间的边界比单一基准分数所暗示的更模糊。模型提供商可以通过专用硬件来使其评估基础设施免受这些影响，但外部评估者很难做到同样的事情。

</template>
</Bilingual>

<Bilingual>
<template #en>

Public benchmarks are typically meant to measure pure model capabilities, but in practice they risk conflating them with infrastructure quirks. Sometimes this may be desirable, as it enables end-to-end testing of the entire stack, but more often it's not. For coding evals meant to be shared publicly, running at multiple times and on multiple days would help average out the noise.

</template>
<template #zh>

公共基准通常旨在衡量纯粹的模型能力，但在实践中，它们有将模型能力与基础设施特性混淆的风险。有时这可能是可取的，因为它可以对整个技术栈进行端到端测试，但更多时候并非如此。对于旨在公开共享的编码评估，在多个时间和多天运行有助于平均掉噪声。

</template>
</Bilingual>

## What we recommend

<Bilingual>
<template #en>

The ideal scenario is to run each eval under the exact same hardware conditions — both the scaffold running the eval and the inference stack — as it would ensure perfect reproducibility across the board. However, this may not always be practical.

</template>
<template #zh>

理想情况是在完全相同的硬件条件下运行每个评估——包括运行评估的脚手架和推理栈——因为这将确保全面的完美可复现性。然而，这并不总是可行的。

</template>
</Bilingual>

<Bilingual>
<template #en>

<mark>Given how container runtimes actually enforce resources — via a guaranteed allocation and a separate hard kill threshold — we recommend that evals specify both parameters per task, not a single pinned value.</mark> A single exact spec sets the guaranteed allocation equal to the kill threshold, leaving zero margin: the transient memory spikes we documented at 1x are enough to destabilize the eval. Separating the two parameters lets you give containers enough breathing room to avoid spurious OOM kills, while still enforcing a hard ceiling that prevents score inflation.

</template>
<template #zh>

<mark>鉴于容器运行时实际执行资源的方式——通过保证分配量和独立的硬杀死阈值——我们建议评估按任务指定这两个参数，而不是单一固定值。</mark>单一精确规格将保证分配量设为等于杀死阈值，不留任何余量：我们在 1x 时记录的瞬时内存峰值就足以使评估不稳定。将两个参数分开可以让容器有足够的呼吸空间来避免虚假的 OOM 杀死，同时仍然执行一个硬性上限以防止分数膨胀。

</template>
</Bilingual>

<Bilingual>
<template #en>

The band between them should be calibrated so that scores at the floor and ceiling fall within noise of each other. For instance, in Terminal-Bench 2.0, a 3x ceiling over the per-task specs cut infra error rates by roughly two-thirds (5.8% to 2.1%, p < 0.001) while keeping the score lift modest and well within noise (p = 0.40). That's a reasonable tradeoff: the infrastructure confounder is largely neutralized without removing meaningful resource pressure. The exact multiplier will vary by benchmark and task distribution, and should thus be reported, but the empirical calibration principle is general.

</template>
<template #zh>

两者之间的区间应该这样校准：使得下限和上限处的分数落在彼此的噪声范围内。例如，在 Terminal-Bench 2.0 中，在每任务规格之上设 3 倍上限，将基础设施错误率降低了约三分之二（5.8% 到 2.1%，p < 0.001），同时将分数提升保持在适度且远在噪声范围内（p = 0.40）。这是一个合理的权衡：基础设施混淆因素基本被中和，同时没有消除有意义的资源压力。确切的倍数会因基准和任务分布而异，因此应该被报告，但经验校准原则是通用的。

</template>
</Bilingual>

## Why we care

<Bilingual>
<template #en>

These findings have practical consequences beyond eval infrastructure. Benchmark scores are increasingly used as decision-making inputs, but this increased attention (and reliance) hasn't always come with corresponding rigor in how they're run or reported. <mark>As things stand today, a 2-point lead on a leaderboard might reflect a genuine capability difference, or it might reflect that one eval ran on beefier hardware, or even at a luckier time of day, or both.</mark> Without published (or standardized) setup configurations, it's hard to tell from the outside unless interested parties go the extra mile to reproduce objective results under identical conditions.

</template>
<template #zh>

这些发现对评估基础设施之外有实际影响。基准分数越来越多地被用作决策输入，但这种日益增长的关注（和依赖）并不总是伴随着运行和报告方式上相应的严谨性。<mark>就目前而言，排行榜上 2 分的领先可能反映了真正的能力差异，也可能反映了某个评估运行在更强大的硬件上，甚至在更幸运的时间段运行，或两者兼有。</mark>如果没有公开（或标准化）的设置配置，从外部很难判断，除非相关方付出额外努力在相同条件下复现客观结果。

</template>
</Bilingual>

<Bilingual>
<template #en>

For labs like Anthropic, the implication is that resource configuration for agentic evals should be treated as a first-class experimental variable, documented and controlled with the same rigor as prompt format or sampling temperature. For benchmark maintainers, publishing recommended resource specs (as Terminal-Bench 2.0 does) can go a long way, while specifying enforcement methodology would close the gap we identified. And for anyone consuming benchmark results, the core takeaway is that small score differences on agentic evals carry more uncertainty than the precision of the reported numbers suggests — especially as some confounders are simply too hard to control for.

</template>
<template #zh>

对于 Anthropic 这样的实验室而言，这意味着智能体评估的资源配置应被视为一等实验变量，以与提示词格式或采样温度相同的严谨性来记录和控制。对于基准维护者来说，发布推荐资源规格（如 Terminal-Bench 2.0 所做的）可以大有帮助，而指定执行方法则可以弥合我们发现的差距。对于任何使用基准结果的人来说，核心要点是：智能体评估上的小分数差异所携带的不确定性，比报告数字的精确度所暗示的更大——尤其是一些混淆因素根本难以控制。

</template>
</Bilingual>

<Bilingual>
<template #en>

<mark>Until resource methodology is standardized, our data suggests that leaderboard differences below 3 percentage points deserve skepticism until the eval configuration is documented and matched.</mark> The observed spread across the moderate range of resource configurations in Terminal-Bench is just below 2 percentage points. Naive binomial confidence intervals already span 1-2 percentage points; the infrastructure confounders we document here stack on top of that, not within it. At the extremes of the allocation range, the spread reaches 6.

</template>
<template #zh>

<mark>在资源方法标准化之前，我们的数据表明，低于 3 个百分点的排行榜差异在评估配置被记录和匹配之前值得怀疑。</mark>在 Terminal-Bench 中等资源配置范围内观察到的差距略低于 2 个百分点。朴素的二项置信区间已经跨越 1-2 个百分点；我们在此记录的基础设施混淆因素是叠加在上面的，而不是包含在其中。在分配范围的两端，差距达到 6 个百分点。

</template>
</Bilingual>

<Bilingual>
<template #en>

A few-point lead might signal a real capability gap — or it might just be a bigger VM.

</template>
<template #zh>

几分领先可能标志着真正的能力差距——也可能只是一台更大的虚拟机。

</template>
</Bilingual>

## Acknowledgements

<Bilingual>
<template #en>

Written by Gian Segato. Special thanks to Nicholas Carlini, Jeremy Hadfield, Mike Merrill, and Alex Shaw for their contributions. This work reflects the collective efforts of several teams working on evaluations for coding agents. Interested candidates who would like to contribute are welcome to apply at [anthropic.com/careers](http://anthropic.com/careers).

</template>
<template #zh>

作者：Gian Segato。特别感谢 Nicholas Carlini、Jeremy Hadfield、Mike Merrill 和 Alex Shaw 的贡献。这项工作反映了多个从事编码智能体评估的团队的集体努力。有兴趣贡献的候选人欢迎在 [anthropic.com/careers](http://anthropic.com/careers) 申请。

</template>
</Bilingual>
