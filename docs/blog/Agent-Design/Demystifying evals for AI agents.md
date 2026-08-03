---
title: Demystifying evals for AI agents
date: 2026-08-13
summary: Anthropic 原文 "Demystifying evals for AI agents" 的中英双语对照翻译，涵盖 AI 智能体评估的核心概念、评估器类型、评估流程和最佳实践。
tags:
  - Agent Design
---

# Demystifying evals for AI agents

> 原文链接：[Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) · Published Jan 09, 2026

<Bilingual>
<template #en>

The capabilities that make agents useful also make them difficult to evaluate. The strategies that work across deployments combine techniques to match the complexity of the systems they measure.

</template>
<template #zh>

让智能体变得有用的那些能力，同时也让它们难以被评估。在各类部署场景中行之有效的策略，往往是将多种技术组合起来，以匹配其所衡量系统的复杂程度。

</template>
</Bilingual>

## Introduction

<Bilingual>
<template #en>

<mark>Good evaluations help teams ship AI agents more confidently.</mark> Without them, it's easy to get stuck in reactive loops — catching issues only in production, where fixing one failure creates others. Evals make problems and behavioral changes visible before they affect users, and their value compounds over the lifecycle of an agent.

</template>
<template #zh>

<mark>良好的评估能帮助团队更自信地发布 AI 智能体。</mark>没有评估，团队很容易陷入被动循环——只在生产环境中才发现问题，而修复一个故障又可能引入新的故障。评估让问题和行为变化在影响用户之前就变得可见，而且其价值会在智能体的整个生命周期中不断累积。

</template>
</Bilingual>

<Bilingual>
<template #en>

As we described in [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), agents operate over many turns: calling tools, modifying state, and adapting based on intermediate results. These same capabilities that make AI agents useful — autonomy, intelligence, and flexibility — also make them harder to evaluate.

</template>
<template #zh>

正如我们在 [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) 一文中所述，智能体在多个回合中运作：调用工具、修改状态，并根据中间结果进行调整。正是这些让 AI 智能体变得有用的能力——自主性、智能性和灵活性——同时也让它们更难被评估。

</template>
</Bilingual>

<Bilingual>
<template #en>

Through our internal work and with customers at the frontier of agent development, we've learned how to design more rigorous and useful evals for agents. Here's what's worked across a range of agent architectures and use cases in real-world deployment.

</template>
<template #zh>

通过我们的内部工作以及与处于智能体开发前沿的客户合作，我们学会了如何为智能体设计更严谨、更实用的评估。以下是我们在各种智能体架构和实际部署用例中验证有效的经验。

</template>
</Bilingual>

## The structure of an evaluation

<Bilingual>
<template #en>

An **evaluation** ("eval") is a test for an AI system: give an AI an input, then apply grading logic to its output to measure success. In this post, we focus on **automated evals** that can be run during development without real users.

</template>
<template #zh>

**评估（evaluation，简称 eval）** 是对 AI 系统的测试：给 AI 一个输入，然后对其输出应用评分逻辑来衡量是否成功。在本文中，我们聚焦于**自动化评估**，即可以在开发阶段运行、无需真实用户参与的评估。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Single-turn evaluations** are straightforward: a prompt, a response, and grading logic. For earlier LLMs, single-turn, non-agentic evals were the main evaluation method. As AI capabilities have advanced, **multi-turn evaluations** have become increasingly common.

</template>
<template #zh>

**单轮评估** 简单直接：一个提示词、一个回答、一套评分逻辑。对于早期的 LLM，单轮、非智能体的评估是主要的评估方法。随着 AI 能力的进步，**多轮评估** 变得越来越普遍。

</template>
</Bilingual>

<Bilingual>
<template #en>

In a simple eval, an agent processes a prompt, and a grader checks if the output matches expectations. For a more complex multi-turn eval, a coding agent receives tools, a task (building an MCP server in this case), and an environment, executes an "agent loop" (tool calls and reasoning), and updates the environment with the implementation. Grading then uses unit tests to verify the working MCP server.

</template>
<template #zh>

在简单的评估中，智能体处理一个提示词，评分器检查输出是否符合预期。在更复杂的多轮评估中，一个编码智能体接收工具、一个任务（此例中是构建一个 MCP 服务器）和一个环境，执行"智能体循环"（工具调用和推理），并用实现结果更新环境。评分阶段随后使用单元测试来验证 MCP 服务器是否正常工作。

</template>
</Bilingual>

<Bilingual>
<template #en>

<mark>Agent evaluations are even more complex. Agents use tools across many turns, modifying state in the environment and adapting as they go — which means mistakes can propagate and compound.</mark> Frontier models can also find creative solutions that surpass the limits of static evals. For instance, Opus 4.5 solved a [𝜏2-bench](https://github.com/sierra-research/tau2-bench) problem about booking a flight by [discovering](https://www.anthropic.com/news/claude-opus-4-5) a loophole in the policy. It "failed" the evaluation as written, but actually came up with a better solution for the user.

</template>
<template #zh>

<mark>智能体评估更加复杂。智能体在多个回合中使用工具，在环境中修改状态并随时调整——这意味着错误可以传播和叠加。</mark>前沿模型还能找到创造性的解决方案，超越静态评估的局限。例如，Opus 4.5 在解决一个关于预订航班的 [𝜏2-bench](https://github.com/sierra-research/tau2-bench) 问题时，[发现](https://www.anthropic.com/news/claude-opus-4-5)了策略中的一个漏洞。它按评估的字面标准"失败"了，但实际上为用户提供了一个更好的解决方案。

</template>
</Bilingual>

<Bilingual>
<template #en>

When building agent evaluations, we use the following definitions:

- A **task** (a.k.a **problem** or **test case**) is a single test with defined inputs and success criteria.
- Each attempt at a task is a **trial**. Because model outputs vary between runs, we run multiple trials to produce more consistent results.
- A **grader** is logic that scores some aspect of the agent's performance. A task can have multiple graders, each containing multiple assertions (sometimes called **checks**).
- A **transcript** (also called a **trace** or **trajectory**) is the complete record of a trial, including outputs, tool calls, reasoning, intermediate results, and any other interactions. For the Anthropic API, this is the full messages array at the end of an eval run — containing all the calls to the API and all of the returned responses during the evaluation.
- The **outcome** is the final state in the environment at the end of the trial. A flight-booking agent might say "Your flight has been booked" at the end of the transcript, but the outcome is whether a reservation exists in the environment's SQL database.
- An **evaluation harness** is the infrastructure that runs evals end-to-end. It provides instructions and tools, runs tasks concurrently, records all the steps, grades outputs, and aggregates results.
- An **agent harness** (or **scaffold**) is the system that enables a model to act as an agent: it processes inputs, orchestrates tool calls, and returns results. When we evaluate "an agent," we're evaluating the harness *and* the model working together. For example, [Claude Code](https://claude.com/product/claude-code) is a flexible agent harness, and we used its core primitives through the [Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview) to build our [long-running agent harness](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents).
- An **evaluation suite** is a collection of tasks designed to measure specific capabilities or behaviors. Tasks in a suite typically share a broad goal. For instance, a customer support eval suite might test refunds, cancellations, and escalations.

</template>
<template #zh>

在构建智能体评估时，我们使用以下定义：

- **任务（task）**（也称 **问题（problem）** 或 **测试用例（test case）**）是一个具有明确定义的输入和成功标准的单次测试。
- 每次对任务的尝试称为一次**试验（trial）**。由于模型输出在不同运行之间会有变化，我们通过多次试验来获得更一致的结果。
- **评分器（grader）** 是对智能体表现的某个方面进行打分的逻辑。一个任务可以有多个评分器，每个评分器包含多个断言（有时称为**检查（checks）**）。
- **记录（transcript）**（也称 **轨迹（trace）** 或 **trajectory**）是一次试验的完整记录，包括输出、工具调用、推理、中间结果以及所有其他交互。对于 Anthropic API，这是评估运行结束时的完整 messages 数组——包含评估期间对 API 的所有调用和所有返回的响应。
- **结果（outcome）** 是试验结束时环境中的最终状态。一个航班预订智能体可能在记录末尾说"您的航班已预订"，但结果是指环境的 SQL 数据库中是否存在一条预订记录。
- **评估框架（evaluation harness）** 是端到端运行评估的基础设施。它提供指令和工具，并发运行任务，记录所有步骤，对输出评分，并汇总结果。
- **智能体框架（agent harness）**（或 **脚手架（scaffold）**）是使模型能够作为智能体运作的系统：它处理输入，编排工具调用，并返回结果。当我们评估"一个智能体"时，我们评估的是框架*和*模型协同工作的整体。例如，[Claude Code](https://claude.com/product/claude-code) 是一个灵活的智能体框架，我们通过 [Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview) 使用其核心原语来构建我们的[长时间运行智能体框架](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)。
- **评估套件（evaluation suite）** 是为衡量特定能力或行为而设计的一组任务的集合。套件中的任务通常共享一个宽泛的目标。例如，一个客户支持评估套件可能测试退款、取消和升级处理。

</template>
</Bilingual>

## Why build evaluations?

<Bilingual>
<template #en>

When teams first start building agents, they can get surprisingly far through a combination of manual testing, [dogfooding](https://en.wikipedia.org/wiki/Eating_your_own_dog_food), and intuition. More rigorous evaluation may even seem like overhead that slows down shipping. But after the early prototyping stages, once an agent is in production and has started scaling, building without evals starts to break down.

</template>
<template #zh>

当团队刚开始构建智能体时，通过手动测试、[内部试用（dogfooding）](https://en.wikipedia.org/wiki/Eating_your_own_dog_food)和直觉的组合，往往能走得很远。更严谨的评估甚至可能被视为拖慢发布速度的开销。但在早期原型阶段之后，一旦智能体进入生产环境并开始扩展，没有评估的开发就会开始出问题。

</template>
</Bilingual>

<Bilingual>
<template #en>

<mark>The breaking point often comes when users report the agent feels worse after changes, and the team is "flying blind" with no way to verify except to guess and check.</mark> Absent evals, debugging is reactive: wait for complaints, reproduce manually, fix the bug, and hope nothing else regressed. Teams can't distinguish real regressions from noise, automatically test changes against hundreds of scenarios before shipping, or measure improvements.

</template>
<template #zh>

<mark>崩溃点往往出现在用户反馈智能体在改动后变差了，而团队却"盲人飞行"——除了猜测和检查，没有其他验证手段。</mark>没有评估，调试是被动的：等待投诉、手动复现、修复 bug，然后祈祷没有引入其他回归。团队无法区分真正的回归和噪音，无法在发布前针对数百个场景自动测试变更，也无法衡量改进效果。

</template>
</Bilingual>

<Bilingual>
<template #en>

We've seen this progression play out many times. For instance, Claude Code started with fast iteration based on feedback from Anthropic employees and external users. Later, we added evals — first for narrow areas like concision and file edits, and then for more complex behaviors like over-engineering. These evals helped identify issues, guide improvements, and focus research-product collaborations. Combined with production monitoring, A/B tests, user research, and more, evals provide signals to continue improving Claude Code as it scales.

</template>
<template #zh>

我们多次目睹了这一进程。例如，Claude Code 最初基于 Anthropic 员工和外部用户的反馈进行快速迭代。后来，我们加入了评估——先是针对简洁性和文件编辑等狭窄领域，然后扩展到过度工程等更复杂的行为。这些评估帮助识别问题、指导改进，并聚焦研究与产品团队的合作。结合生产监控、A/B 测试、用户研究等手段，评估为持续改进 Claude Code 提供了信号。

</template>
</Bilingual>

<Bilingual>
<template #en>

Writing evals is useful at any stage in the agent lifecycle. Early on, evals force product teams to specify what success means for the agent, while later they help uphold a consistent quality bar.

</template>
<template #zh>

在智能体生命周期的任何阶段编写评估都是有用的。早期，评估迫使产品团队明确智能体成功的定义；后期，它们帮助维持一致的质量标准。

</template>
</Bilingual>

<Bilingual>
<template #en>

[Descript](https://www.descript.com/)'s agent helps users edit videos, so they built evals around three dimensions of a successful editing workflow: don't break things, do what I asked, and do it well. They evolved from manual grading to LLM graders with criteria defined by the product team and periodic human calibration, and now regularly run two separate suites for quality benchmarking and regression testing. The [Bolt](https://bolt.new/) AI team started building evals later, after they already had a widely used agent. In 3 months, they built an eval system that runs their agent and grades outputs with static analysis, uses browser agents to test apps, and employs LLM judges for behaviors like instruction following.

</template>
<template #zh>

[Descript](https://www.descript.com/) 的智能体帮助用户编辑视频，因此他们围绕成功编辑工作流的三个维度构建评估：不破坏现有内容、按要求执行、做得好。他们从手动评分发展到由产品团队定义标准、定期人工校准的 LLM 评分器，现在定期运行两套独立的评估套件用于质量基准测试和回归测试。[Bolt](https://bolt.new/) AI 团队在已有广泛使用的智能体后才开始构建评估。在 3 个月内，他们构建了一个评估系统：运行智能体并用静态分析对输出评分、使用浏览器智能体测试应用，并使用 LLM 评判器评估指令遵循等行为。

</template>
</Bilingual>

<Bilingual>
<template #en>

Some teams create evals at the start of development; others add them once at scale when evals become a bottleneck for improving the agent. Evals are especially useful at the start of agent development to explicitly encode expected behavior. Two engineers reading the same initial spec could come away with different interpretations on how the AI should handle edge cases. An eval suite resolves this ambiguity. Regardless of when they're created, evals help accelerate development.

</template>
<template #zh>

有些团队在开发之初就创建评估；另一些则在规模扩大后、评估成为改进智能体的瓶颈时才加入。在智能体开发初期，评估对于明确编码预期行为尤为重要。两位工程师阅读同一份初始规格文档，可能对 AI 应如何处理边界情况得出不同的理解。评估套件可以消除这种模糊性。无论何时创建，评估都能帮助加速开发。

</template>
</Bilingual>

<Bilingual>
<template #en>

Evals also shape how quickly you can adopt new models. When more powerful models come out, teams without evals face weeks of testing while competitors with evals can quickly determine the model's strengths, tune their prompts, and upgrade in days.

</template>
<template #zh>

评估还影响你采用新模型的速度。当更强大的模型发布时，没有评估的团队面临数周的测试，而拥有评估的竞争对手可以快速确定模型的优势、调整提示词，并在几天内完成升级。

</template>
</Bilingual>

<Bilingual>
<template #en>

Once evals exist, you get baselines and regression tests for free: latency, token usage, cost per task, and error rates can be tracked on a static bank of tasks. Evals can also become the highest-bandwidth communication channel between product and research teams, defining metrics researchers can optimize against. <mark>Clearly, evals have wide-ranging benefits beyond tracking regressions and improvements. Their compounding value is easy to miss given that costs are visible upfront while benefits accumulate later.</mark>

</template>
<template #zh>

一旦评估建立，你就免费获得了基线和回归测试：延迟、token 使用量、每个任务的成本和错误率都可以在一组固定任务上进行追踪。评估还可以成为产品团队和研究团队之间最高带宽的沟通渠道，定义研究人员可以优化的指标。<mark>显然，评估的广泛益处远不止于追踪回归和改进。其复利价值容易被忽视，因为成本是前期可见的，而收益是后期累积的。</mark>

</template>
</Bilingual>

## How to evaluate AI agents

<Bilingual>
<template #en>

We see several common types of agents deployed at scale today, including coding agents, research agents, computer use agents, and conversational agents. Each type may be deployed across a wide variety of industries, but they can be evaluated using similar techniques. You don't need to invent an evaluation from scratch. The sections below describe proven techniques for several agent types. Use these methods as a foundation, then extend them to your domain.

</template>
<template #zh>

我们看到目前大规模部署的智能体有几种常见类型，包括编码智能体、研究智能体、计算机使用智能体和对话智能体。每种类型可能部署在各种行业中，但都可以用类似的技术来评估。你不需要从零开始发明评估方法。以下章节描述了几种智能体类型的经验证技术。以这些方法为基础，然后扩展到你的领域。

</template>
</Bilingual>

### Types of graders for agents

<Bilingual>
<template #en>

Agent evaluations typically combine three types of graders: code-based, model-based, and human. Each grader evaluates some portion of either the transcript or the outcome. An essential component of effective evaluation design is to choose the right graders for the job.

</template>
<template #zh>

智能体评估通常组合使用三种评分器：基于代码的、基于模型的和人工评分器。每种评分器评估记录或结果的某个部分。有效评估设计的一个关键要素是为任务选择合适的评分器。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Code-based graders**

**Methods:** String match checks (exact, regex, fuzzy, etc.) · Binary tests (fail-to-pass, pass-to-pass) · Static analysis (lint, type, security) · Outcome verification · Tool calls verification (tools used, parameters) · Transcript analysis (turns taken, token usage)

**Strengths:** Fast · Cheap · Objective · Reproducible · Easy to debug · Verify specific conditions

**Weaknesses:** Brittle to valid variations that don't match expected patterns exactly · Lacking in nuance · Limited for evaluating some more subjective tasks

</template>
<template #zh>

**基于代码的评分器**

**方法：** 字符串匹配检查（精确匹配、正则、模糊匹配等） · 二元测试（fail-to-pass、pass-to-pass） · 静态分析（lint、类型、安全） · 结果验证 · 工具调用验证（使用的工具、参数） · 记录分析（回合数、token 使用量）

**优势：** 快速 · 低成本 · 客观 · 可复现 · 易于调试 · 验证特定条件

**劣势：** 对不精确匹配预期模式的有效变体过于脆弱 · 缺乏细微差别 · 在评估一些较主观的任务时受限

</template>
</Bilingual>

<Bilingual>
<template #en>

**Model-based graders**

**Methods:** Rubric-based scoring · Natural language assertions · Pairwise comparison · Reference-based evaluation · Multi-judge consensus

**Strengths:** Flexible · Scalable · Captures nuance · Handles open-ended tasks · Handles freeform output

**Weaknesses:** Non-deterministic · More expensive than code · Requires calibration with human graders for accuracy

</template>
<template #zh>

**基于模型的评分器**

**方法：** 基于评分标准的打分 · 自然语言断言 · 成对比较 · 基于参考答案的评估 · 多评判器共识

**优势：** 灵活 · 可扩展 · 能捕捉细微差别 · 处理开放式任务 · 处理自由格式输出

**劣势：** 非确定性 · 比代码评分器更贵 · 需要与人工评分器校准以确保准确性

</template>
</Bilingual>

<Bilingual>
<template #en>

**Human graders**

**Methods:** SME review · Crowdsourced judgment · Spot-check sampling · A/B testing · Inter-annotator agreement

**Strengths:** Gold standard quality · Matches expert user judgment · Used to calibrate model-based graders

**Weaknesses:** Expensive · Slow · Often requires access to human experts at scale

</template>
<template #zh>

**人工评分器**

**方法：** 领域专家评审 · 众包判断 · 抽样检查 · A/B 测试 · 标注者间一致性

**优势：** 黄金标准质量 · 匹配专家用户判断 · 用于校准基于模型的评分器

**劣势：** 昂贵 · 缓慢 · 通常需要大规模获取人工专家资源

</template>
</Bilingual>

<Bilingual>
<template #en>

For each task, scoring can be weighted (combined grader scores must hit a threshold), binary (all graders must pass), or a hybrid.

</template>
<template #zh>

对于每个任务，评分可以是加权方式（组合评分器分数需达到阈值）、二元方式（所有评分器必须通过），或混合方式。

</template>
</Bilingual>

### Capability vs. regression evals

<Bilingual>
<template #en>

**Capability or "quality" evals** ask, "What can this agent do well?" They should start at a low pass rate, targeting tasks the agent struggles with and giving teams a hill to climb.

</template>
<template #zh>

**能力评估（capability evals）**（也称"质量评估"）问的是："这个智能体能做好什么？"它们应该从低通过率开始，针对智能体表现不佳的任务，给团队一个需要攀登的山峰。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Regression evals** ask, "Does the agent still handle all the tasks it used to?" and should have a nearly 100% pass rate. They protect against backsliding, as a decline in score signals that something is broken and needs to be improved. As teams hill-climb on capability evals, it's important to also run regression evals to make sure changes don't cause issues elsewhere.

</template>
<template #zh>

**回归评估（regression evals）** 问的是："智能体是否仍然能处理以前能做的所有任务？"其通过率应该接近 100%。它们防止倒退——分数下降意味着出了问题，需要改进。当团队在能力评估上攀登时，同时运行回归评估也很重要，以确保变更不会在其他地方引发问题。

</template>
</Bilingual>

<Bilingual>
<template #en>

<mark>After an agent is launched and optimized, capability evals with high pass rates can "graduate" to become a regression suite that is run continuously to catch any drift.</mark> Tasks that once measured "Can we do this at all?" then measure "Can we still do this reliably?"

</template>
<template #zh>

<mark>在智能体发布并优化后，高通过率的能力评估可以"毕业"成为回归套件，持续运行以捕捉任何漂移。</mark>曾经衡量"我们能做到这个吗？"的任务，转而衡量"我们还能可靠地做到这个吗？"

</template>
</Bilingual>

### Evaluating coding agents

<Bilingual>
<template #en>

**Coding agents** write, test, and debug code, navigating codebases and running commands much like a human developer. Effective evals for modern coding agents usually rely on well-specified tasks, stable test environments, and thorough tests for the generated code.

</template>
<template #zh>

**编码智能体** 编写、测试和调试代码，像人类开发者一样浏览代码库并运行命令。现代编码智能体的有效评估通常依赖于明确定义的任务、稳定的测试环境，以及对生成代码的全面测试。

</template>
</Bilingual>

<Bilingual>
<template #en>

Deterministic graders are natural for coding agents because software is generally straightforward to evaluate: does the code run and do the tests pass? Two widely used coding agent benchmarks, [SWE-bench Verified](https://www.swebench.com/SWE-bench/) and [Terminal-Bench](https://www.tbench.ai/), follow this approach. SWE-bench Verified gives agents GitHub issues from popular Python repositories and grades solutions by running the test suite; a solution passes only if it fixes the failing tests without breaking existing ones. <mark>LLMs have progressed from 40% to >80% on this eval in just one year.</mark> Terminal-Bench takes a different track: it tests end-to-end technical tasks, such as building a Linux kernel from source or training an ML model.

</template>
<template #zh>

确定性评分器天然适合编码智能体，因为软件通常易于评估：代码能运行吗？测试通过了吗？两个广泛使用的编码智能体基准——[SWE-bench Verified](https://www.swebench.com/SWE-bench/) 和 [Terminal-Bench](https://www.tbench.ai/)——都采用了这一方法。SWE-bench Verified 给智能体分配来自热门 Python 仓库的 GitHub issue，通过运行测试套件来评分解决方案；只有修复了失败的测试且不破坏现有测试，解决方案才算通过。<mark>LLM 在这一评估上仅用一年时间就从 40% 提升到了 >80%。</mark>Terminal-Bench 采取了不同路线：它测试端到端的技术任务，例如从源码构建 Linux 内核或训练 ML 模型。

</template>
</Bilingual>

<Bilingual>
<template #en>

Once you have a set of pass-or-fail tests for validating the key *outcomes* of a coding task, it's often useful to also grade the *transcript*. For instance, heuristics-based code quality rules can evaluate the generated code based on more than passing tests, and model-based graders with clear rubrics can assess behaviors like how the agent calls tools or interacts with the user.

</template>
<template #zh>

一旦你有了一组用于验证编码任务关键*结果*的通过/失败测试，对*记录*进行评分通常也很有用。例如，基于启发式的代码质量规则可以在通过测试之外评估生成代码的质量，而基于模型的评分器配合清晰的评分标准可以评估智能体的工具调用方式或与用户的交互方式等行为。

</template>
</Bilingual>

**Example: Theoretical evaluation for a coding agent**

<Bilingual>
<template #en>

Consider a coding task where the agent must fix an authentication bypass vulnerability. As shown in the illustrative YAML file below, one could evaluate this agent using both graders and metrics.

</template>
<template #zh>

考虑一个编码任务，智能体需要修复一个身份验证绕过漏洞。如下面示例 YAML 文件所示，可以使用多种评分器和指标来评估这个智能体。

</template>
</Bilingual>

```yaml
task:
  id: "fix-auth-bypass_1"
  desc: "Fix authentication bypass when password field is empty and ..."
  graders:
    - type: deterministic_tests
      required: [test_empty_pw_rejected.py, test_null_pw_rejected.py]
    - type: llm_rubric
      rubric: prompts/code_quality.md
    - type: static_analysis
      commands: [ruff, mypy, bandit]
    - type: state_check
      expect:
        security_logs: {event_type: "auth_blocked"}
    - type: tool_calls
      required:
        - {tool: read_file, params: {path: "src/auth/*"}}
        - {tool: edit_file}
        - {tool: run_tests}
  tracked_metrics:
    - type: transcript
      metrics:
        - n_turns
        - n_toolcalls
        - n_total_tokens
    - type: latency
      metrics:
        - time_to_first_token
        - output_tokens_per_sec
        - time_to_last_token
```

<Bilingual>
<template #en>

Note that this example showcases the full range of available graders for illustration. In practice, coding evaluations typically rely on unit tests for correctness verification and an LLM rubric for assessing overall code quality, with additional graders and metrics added only as needed.

</template>
<template #zh>

注意，此示例展示了所有可用评分器以作说明。在实际中，编码评估通常依赖单元测试验证正确性，使用 LLM 评分标准评估整体代码质量，仅在需要时才添加额外的评分器和指标。

</template>
</Bilingual>

### Evaluating conversational agents

<Bilingual>
<template #en>

**Conversational agents** interact with users in domains like support, sales, or coaching. Unlike traditional chatbots, they maintain state, use tools, and take actions mid-conversation. While coding and research agents can also involve many turns of interaction with the user, conversational agents present a distinct challenge: the quality of the interaction itself is part of what you're evaluating. Effective evals for conversational agents usually rely on verifiable end-state outcomes and rubrics that capture both task completion and interaction quality. Unlike most other evals, they often require a second LLM to simulate the user. We use this approach in our [alignment auditing agents](https://alignment.anthropic.com/2025/automated-auditing/) to stress-test models through extended, adversarial conversations.

</template>
<template #zh>

**对话智能体** 在支持、销售或辅导等领域与用户交互。与传统聊天机器人不同，它们维护状态、使用工具，并在对话过程中执行操作。虽然编码和研究智能体也可能涉及与用户的多轮交互，但对话智能体提出了一个独特挑战：交互质量本身也是评估内容的一部分。对话智能体的有效评估通常依赖于可验证的最终状态结果，以及同时捕捉任务完成度和交互质量的评分标准。与大多数其他评估不同，它们通常需要第二个 LLM 来模拟用户。我们在[对齐审计智能体](https://alignment.anthropic.com/2025/automated-auditing/)中使用这一方法，通过延伸的对抗性对话对模型进行压力测试。

</template>
</Bilingual>

<Bilingual>
<template #en>

Success for conversational agents can be multidimensional: is the ticket resolved (state check), did it finish in <10 turns (transcript constraint), and was the tone appropriate (LLM rubric)? Two benchmarks that incorporate multidimensionality are [𝜏-Bench](https://arxiv.org/abs/2406.12045) and its successor, [τ2-Bench](https://arxiv.org/abs/2506.07982). These simulate multi-turn interactions across domains like retail support and airline booking, where one model plays a user persona while the agent navigates realistic scenarios.

</template>
<template #zh>

对话智能体的成功可以是多维的：工单是否已解决（状态检查），是否在 10 个回合内完成（记录约束），语气是否恰当（LLM 评分标准）？两个融入了多维度的基准是 [𝜏-Bench](https://arxiv.org/abs/2406.12045) 及其续作 [τ2-Bench](https://arxiv.org/abs/2506.07982)。它们在零售支持和航空预订等领域模拟多轮交互，其中一个模型扮演用户角色，智能体则在其中应对真实场景。

</template>
</Bilingual>

**Example: Theoretical evaluation for a conversational agent**

<Bilingual>
<template #en>

Consider a support task where the agent must handle a refund for a frustrated customer.

</template>
<template #zh>

考虑一个支持任务，智能体需要为一位沮丧的客户处理退款。

</template>
</Bilingual>

```yaml
graders:
  - type: llm_rubric
    rubric: prompts/support_quality.md
    assertions:
      - "Agent showed empathy for customer's frustration"
      - "Resolution was clearly explained"
      - "Agent's response grounded in fetch_policy tool results"
  - type: state_check
    expect:
      tickets: {status: resolved}
      refunds: {status: processed}
  - type: tool_calls
    required:
      - {tool: verify_identity}
      - {tool: process_refund, params: {amount: "<=100"}}
      - {tool: send_confirmation}
  - type: transcript
    max_turns: 10
tracked_metrics:
  - type: transcript
    metrics:
      - n_turns
      - n_toolcalls
      - n_total_tokens
  - type: latency
    metrics:
      - time_to_first_token
      - output_tokens_per_sec
      - time_to_last_token
```

<Bilingual>
<template #en>

As in our coding agent example, this task showcases multiple grader types for illustration. In practice, conversational agent evaluations typically use model-based graders to assess both communication quality and goal completion, because many tasks — like answering a question — may have multiple "correct" solutions.

</template>
<template #zh>

与编码智能体示例一样，此任务展示了多种评分器类型以作说明。在实际中，对话智能体评估通常使用基于模型的评分器来同时评估沟通质量和目标完成度，因为许多任务——比如回答一个问题——可能有多种"正确"的解决方案。

</template>
</Bilingual>

### Evaluating research agents

<Bilingual>
<template #en>

**Research agents** gather, synthesize, and analyze information, then produce outputs like an answer or report. Unlike coding agents where unit tests provide binary pass/fail signals, research quality can only be judged relative to the task. What counts as "comprehensive," "well-sourced," or even "correct" depends on context: a market scan, due diligence for an acquisition, and a scientific report each require different standards.

</template>
<template #zh>

**研究智能体** 收集、综合和分析信息，然后产出答案或报告等输出。与编码智能体中单元测试提供二元通过/失败信号不同，研究质量只能相对于任务来评判。什么算"全面"、"有良好来源"甚至"正确"，都取决于上下文：市场扫描、收购尽职调查和科学报告各自需要不同的标准。

</template>
</Bilingual>

<Bilingual>
<template #en>

Research evals face unique challenges: experts may disagree on whether a synthesis is comprehensive, ground truth shifts as reference content changes constantly, and longer, more open-ended outputs create more room for mistakes. A benchmark like [BrowseComp](http://arxiv.org/abs/2504.12516), for example, tests whether AI agents can find needles in haystacks across the open web — questions designed to be easy to verify but hard to solve.

</template>
<template #zh>

研究评估面临独特挑战：专家可能对综合是否全面存在分歧，随着参考内容不断变化，真值也在变化，而更长、更开放的输出为错误留下了更多空间。例如，[BrowseComp](http://arxiv.org/abs/2504.12516) 基准测试 AI 智能体能否在开放网络的"大海捞针"——这些问题被设计为易于验证但难以解决。

</template>
</Bilingual>

<Bilingual>
<template #en>

One strategy to build research agent evals is to combine grader types. Groundedness checks verify that claims are supported by retrieved sources, coverage checks define key facts a good answer must include, and source quality checks confirm the consulted sources are authoritative, rather than simply the first retrieved. For tasks with objectively correct answers ("What was Company X's Q3 revenue?"), exact match works. An LLM can flag unsupported claims and gaps in coverage but also verify the open-ended synthesis for coherence and completeness.

</template>
<template #zh>

构建研究智能体评估的一种策略是组合评分器类型。grounding 检查验证论断是否有检索到的来源支持，覆盖度检查定义好的答案必须包含的关键事实，来源质量检查确认所查阅的来源是权威的，而非仅仅是第一个被检索到的。对于有客观正确答案的任务（"X 公司第三季度营收是多少？"），精确匹配即可。LLM 可以标记不受支持的论断和覆盖缺口，同时也能验证开放式综合内容的连贯性和完整性。

</template>
</Bilingual>

<Bilingual>
<template #en>

Given the subjective nature of research quality, LLM-based rubrics should be frequently calibrated against expert human judgment to grade these agents effectively.

</template>
<template #zh>

鉴于研究质量的主观性，基于 LLM 的评分标准应频繁与专家的人工判断进行校准，以有效地对这些智能体进行评分。

</template>
</Bilingual>

### Computer use agents

<Bilingual>
<template #en>

**Computer use agents** interact with software through the same interface as humans — screenshots, mouse clicks, keyboard inputs, and scrolling — rather than through APIs or code execution. They can use any application with a graphical user interface (GUI), from design tools to legacy enterprise software. Evaluation requires running the agent in a real or sandboxed environment where it can use software applications and checking whether it achieved the intended outcome. For instance, [WebArena](https://arxiv.org/abs/2307.13854) tests browser-based tasks, using URL and page state checks to verify the agent navigated correctly, along with backend state verification for tasks that modify data (confirming an order was actually placed, not just that the confirmation page appeared). [OSWorld](https://os-world.github.io/) extends this to full operating system control, with evaluation scripts that inspect diverse artifacts after task completion: file system state, application configs, database contents, and UI element properties.

</template>
<template #zh>

**计算机使用智能体** 通过与人类相同的界面——截图、鼠标点击、键盘输入和滚动——与软件交互，而非通过 API 或代码执行。它们可以使用任何带图形用户界面（GUI）的应用程序，从设计工具到老旧的企业软件。评估需要在真实或沙箱环境中运行智能体，使其能够使用软件应用程序，并检查是否达成了预期目标。例如，[WebArena](https://arxiv.org/abs/2307.13854) 测试基于浏览器的任务，使用 URL 和页面状态检查验证智能体是否正确导航，并对修改数据的任务进行后端状态验证（确认订单确实已下单，而不仅仅是确认页面出现了）。[OSWorld](https://os-world.github.io/) 将此扩展到完整的操作系统控制，其评估脚本在任务完成后检查多种产物：文件系统状态、应用程序配置、数据库内容和 UI 元素属性。

</template>
</Bilingual>

<Bilingual>
<template #en>

Browser use agents require a balance between token efficiency and latency. DOM-based interactions execute quickly but consume many tokens, while screenshot-based interactions are slower but more token-efficient. For example, when asking Claude to summarize Wikipedia, it is more efficient to extract the text from the DOM. When finding a new laptop case on Amazon, it is more efficient to take screenshots (as extracting the entire DOM is token-intensive). In our Claude for Chrome product, we developed evals to check that the agent was selecting the right tool for each context. This enabled us to complete browser-based tasks faster and more accurately.

</template>
<template #zh>

浏览器使用智能体需要在 token 效率和延迟之间取得平衡。基于 DOM 的交互执行速度快但消耗大量 token，而基于截图的交互较慢但 token 效率更高。例如，当要求 Claude 总结维基百科时，从 DOM 中提取文本更高效。当在亚马逊上找新笔记本电脑壳时，截图更高效（因为提取整个 DOM 非常消耗 token）。在我们的 Claude for Chrome 产品中，我们开发了评估来检查智能体是否在每个上下文中选择了正确的工具。这使我们能够更快、更准确地完成基于浏览器的任务。

</template>
</Bilingual>

### How to think about non-determinism in evaluations for agents

<Bilingual>
<template #en>

Regardless of agent type, agent behavior varies between runs, which makes evaluation results harder to interpret than they first appear. Each task has its own success rate — maybe 90% on one task, 50% on another — and a task that passed on one eval run might fail on the next. Sometimes, what we want to measure is how *often* (what proportion of the trials) an agent succeeds for a task.

</template>
<template #zh>

无论智能体类型如何，智能体行为在不同运行之间会有变化，这使得评估结果比初看之下更难解读。每个任务都有自己的成功率——也许某个任务 90%，另一个 50%——在一次评估中通过的任务可能在下一次失败。有时，我们想衡量的是智能体对于一个任务*多久*成功一次（即试验中成功的比例）。

</template>
</Bilingual>

<Bilingual>
<template #en>

Two metrics help capture this nuance:

[**pass@k**](https://proceedings.neurips.cc/paper/2019/file/7298332f04ac004a0ca44cc69ecf6f6b-Paper.pdf) measures the likelihood that an agent gets at least one correct solution in *k* attempts. As *k* increases, pass@k score rises: more "shots on goal" means higher odds of at least 1 success. A score of 50% pass@1 means that a model succeeds at half the tasks in the eval on its first try. In coding, we're often most interested in the agent finding the solution on the first try — pass@1. In other cases, proposing many solutions is valid as long as one works.

[**pass^k**](https://arxiv.org/abs/2406.12045) measures the probability that *all k* trials succeed. As *k* increases, pass^k falls since demanding consistency across more trials is a harder bar to clear. If your agent has a 75% per-trial success rate and you run 3 trials, the probability of passing all three is (0.75)³ ≈ 42%. This metric especially matters for customer-facing agents where users expect reliable behavior every time.

</template>
<template #zh>

两个指标有助于捕捉这种细微差别：

[**pass@k**](https://proceedings.neurips.cc/paper/2019/file/7298332f04ac004a0ca44cc69ecf6f6b-Paper.pdf) 衡量智能体在 *k* 次尝试中至少得到一个正确解的可能性。随着 *k* 增大，pass@k 分数上升：更多的"射门机会"意味着至少成功一次的概率更高。50% 的 pass@1 意味着模型在评估中一半任务上首次尝试就成功。在编码中，我们通常最关心智能体首次就找到解决方案——pass@1。在其他场景中，只要有一个方案可行，提出多个方案也是有效的。

[**pass^k**](https://arxiv.org/abs/2406.12045) 衡量*所有 k 次*试验都成功的概率。随着 *k* 增大，pass^k 下降，因为要求更多试验间的一致性是一个更高的门槛。如果你的智能体单次试验成功率为 75%，运行 3 次试验，三次都通过的概率是 (0.75)³ ≈ 42%。这个指标对于面向用户的智能体尤为重要，因为用户期望每次都能获得可靠的行为。

</template>
</Bilingual>

<Bilingual>
<template #en>

<mark>Both metrics are useful, and which to use depends on product requirements: pass@k for tools where one success matters, pass^k for agents where consistency is essential.</mark>

</template>
<template #zh>

<mark>两个指标都有用，使用哪个取决于产品需求：pass@k 适用于一次成功就重要的工具，pass^k 适用于一致性至关重要的智能体。</mark>

</template>
</Bilingual>

## Going from zero to one: a roadmap to great evals for agents

<Bilingual>
<template #en>

This section lays out our practical, field-tested advice for going from no evals to evals you can trust. Think of this as a roadmap for eval-driven agent development: define success early, measure it clearly, and iterate continuously.

</template>
<template #zh>

本节阐述我们从零开始构建可信评估的实战经验。将其视为评估驱动智能体开发的路线图：尽早定义成功，清晰衡量它，并持续迭代。

</template>
</Bilingual>

### Collect tasks for the initial eval dataset

<Bilingual>
<template #en>

**Step 0. Start early**

We see teams delay building evals because they think they need hundreds of tasks. In reality, 20-50 simple tasks drawn from real failures is a great start. After all, in early agent development, each change to the system often has a clear, noticeable impact, and this large effect size means small sample sizes suffice. More mature agents may need larger, more difficult evals to detect smaller effects, but it's best to take the 80/20 approach in the beginning. <mark>Evals get harder to build the longer you wait. Early on, product requirements naturally translate into test cases. Wait too long and you're reverse-engineering success criteria from a live system.</mark>

</template>
<template #zh>

**第 0 步：尽早开始**

我们看到团队因为觉得自己需要数百个任务而推迟构建评估。实际上，从真实失败中提取的 20-50 个简单任务就是一个很好的起点。毕竟，在智能体开发的早期，系统的每次改动通常都有明显可感知的影响，这种大效应量意味着小样本量就足够了。更成熟的智能体可能需要更大、更难的评估来检测更小的效应，但一开始最好采用 80/20 方法。<mark>评估越晚构建越难。早期，产品需求自然可以转化为测试用例。等太久，你就要从一个在线系统反向工程成功标准了。</mark>

</template>
</Bilingual>

<Bilingual>
<template #en>

**Step 1. Start with what you already test manually**

Begin with the manual checks you run during development — the behaviors you verify before each release and common tasks end users try. If you're already in production, look at your bug tracker and support queue. Converting user-reported failures into test cases ensures your suite reflects actual usage; prioritizing by user impact helps you invest effort where it counts.

</template>
<template #zh>

**第 1 步：从你已经在手动测试的内容开始**

从你在开发过程中运行的手动检查开始——每次发布前验证的行为，以及终端用户常尝试的任务。如果你已经在生产中，查看你的 bug 跟踪器和支持队列。将用户报告的故障转化为测试用例，确保你的套件反映实际使用情况；按用户影响排优先级，帮助你把精力投在最重要的地方。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Step 2: Write unambiguous tasks with reference solutions**

<mark>Getting task quality right is harder than it seems. A good task is one where two domain experts would independently reach the same pass/fail verdict.</mark> Could they pass the task themselves? If not, the task needs refinement. Ambiguity in task specifications becomes noise in metrics. The same applies to criteria for model-based graders: vague rubrics produce inconsistent judgments.

</template>
<template #zh>

**第 2 步：编写无歧义的任务并提供参考解决方案**

<mark>把任务质量做好比看起来更难。一个好的任务应该让两位领域专家独立地得出相同的通过/失败判定。</mark>他们自己能通过这个任务吗？如果不能，任务需要改进。任务规格中的歧义会变成指标中的噪音。基于模型的评分器的标准也是如此：模糊的评分标准会产生不一致的判断。

</template>
</Bilingual>

<Bilingual>
<template #en>

Each task should be passable by an agent that follows instructions correctly. This can be subtle. For instance, auditing Terminal-Bench revealed that if a task asks the agent to write a script but doesn't specify a filepath, and the tests assume a particular filepath for the script, the agent might fail through no fault of its own. Everything the grader checks should be clear from the task description; agents shouldn't fail due to ambiguous specs. With frontier models, a 0% pass rate across many trials (i.e. 0% pass@100) is most often a signal of a broken task, not an incapable agent, and a sign to double-check your task specification and graders. For each task, it's useful to create a reference solution: a known working output that passes all graders. This proves that the task is solvable and verifies graders are correctly configured.

</template>
<template #zh>

每个任务都应该可以被一个正确遵循指令的智能体通过。这可能很微妙。例如，审计 Terminal-Bench 时发现，如果一个任务要求智能体编写脚本但没有指定文件路径，而测试假设脚本位于特定路径，智能体可能因为非自身原因而失败。评分器检查的所有内容都应该在任务描述中清晰说明；智能体不应该因为模糊的规格而失败。对于前沿模型，多次试验中 0% 的通过率（即 0% pass@100）通常是任务有问题而非智能体能力不足的信号，应仔细检查任务规格和评分器。对于每个任务，创建一个参考解决方案是很有用的：一个已知能通过所有评分器的有效输出。这证明了任务是可解的，并验证评分器配置正确。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Step 3: Build balanced problem sets**

<mark>Test both the cases where a behavior *should* occur and where it *shouldn't*. One-sided evals create one-sided optimization.</mark> For instance, if you only test whether the agent searches when it should, you might end up with an agent that searches for almost everything. Try to avoid [class-imbalanced](https://developers.google.com/machine-learning/crash-course/overfitting/imbalanced-datasets) evals. We learned this firsthand when building evals for web search in [Claude.ai](http://claude.ai/). The challenge was preventing the model from searching when it shouldn't, while preserving its ability to do extensive research when appropriate. The team built evals covering both directions: queries where the model should search (like finding the weather) and queries where it should answer from existing knowledge (like "who founded Apple?"). Striking the right balance between undertriggering (not searching when it should) or overtriggering (searching when it shouldn't) was difficult, and took many rounds of refinements to both the prompts and the eval. As more example problems come up, we continue to add to evals to improve our coverage.

</template>
<template #zh>

**第 3 步：构建平衡的问题集**

<mark>既要测试某种行为*应该*发生的情况，也要测试*不应该*发生的情况。单侧评估会造成单侧优化。</mark>例如，如果你只测试智能体是否在应该搜索时搜索了，你最终可能得到一个对几乎所有东西都搜索的智能体。尽量避免[类别不平衡](https://developers.google.com/machine-learning/crash-course/overfitting/imbalanced-datasets)的评估。我们在为 [Claude.ai](http://claude.ai/) 构建网络搜索评估时 firsthand 学到了这一点。挑战在于防止模型在不该搜索时搜索，同时保留其在适当时进行深入研究的能​​力。团队构建了覆盖两个方向的评估：应该搜索的查询（如查找天气）和应该用已有知识回答的查询（如"谁创立了苹果？"）。在欠触发（该搜索时不搜索）和过触发（不该搜索时搜索）之间取得正确平衡很困难，需要对提示词和评估进行多轮优化。随着更多示例问题的出现，我们持续向评估中添加内容以改善覆盖率。

</template>
</Bilingual>

### Design the eval harness and graders

<Bilingual>
<template #en>

**Step 4: Build a robust eval harness with a stable environment**

It's essential that the agent in the eval functions roughly the same as the agent used in production, and that the environment itself doesn't introduce further noise. Each trial should be "isolated" by starting from a clean environment. Unnecessary shared state between runs (leftover files, cached data, resource exhaustion) can cause correlated failures due to infrastructure flakiness rather than agent performance. Shared state can also artificially inflate performance. For example, in some internal evals we observed Claude gaining an unfair advantage on some tasks by examining the git history from previous trials. If multiple distinct trials fail because of the same limitation in the environment (like limited CPU memory), these trials are not independent because they're affected by the same factor, and the eval results become unreliable for measuring agent performance.

</template>
<template #zh>

**第 4 步：构建健壮的评估框架和稳定的环境**

评估中的智能体应该与生产中使用的智能体大致相同地运作，环境本身也不应引入额外的噪音。每次试验都应该从干净的环境开始以实现"隔离"。运行之间不必要的共享状态（残留文件、缓存数据、资源耗尽）可能因基础设施的不稳定而非智能体表现导致相关联的失败。共享状态也可能人为地夸大性能。例如，在一些内部评估中，我们观察到 Claude 通过检查之前试验的 git 历史在某些任务上获得了不公平的优势。如果多次不同的试验因为环境中的同一个限制（如 CPU 内存不足）而失败，这些试验就不是独立的，因为它们受同一因素影响，评估结果对于衡量智能体性能就变得不可靠。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Step 5: Design graders thoughtfully**

As discussed above, great eval design involves choosing the best graders for the agent and the tasks. We recommend choosing deterministic graders where possible, LLM graders where necessary or for additional flexibility, and using human graders judiciously for additional validation.

</template>
<template #zh>

**第 5 步：精心设计评分器**

如前所述，优秀的评估设计涉及为智能体和任务选择最佳评分器。我们建议尽可能选择确定性评分器，在必要时或需要额外灵活性时使用 LLM 评分器，并审慎地使用人工评分器进行额外验证。

</template>
</Bilingual>

<Bilingual>
<template #en>

<mark>There is a common instinct to check that agents followed very specific steps like a sequence of tool calls in the right order. We've found this approach too rigid and results in overly brittle tests, as agents regularly find valid approaches that eval designers didn't anticipate. So as not to unnecessarily punish creativity, it's often better to grade what the agent produced, not the path it took.</mark>

</template>
<template #zh>

<mark>一种常见的直觉是检查智能体是否遵循了非常具体的步骤，比如按正确顺序的一系列工具调用。我们发现这种方法过于死板，导致测试过于脆弱，因为智能体经常找到评估设计者未曾预料到的有效方法。为了不必要地惩罚创造性，通常更好的做法是评估智能体产出了什么，而不是它走了什么路径。</mark>

</template>
</Bilingual>

<Bilingual>
<template #en>

For tasks with multiple components, build in partial credit. A support agent that correctly identifies the problem and verifies the customer but fails to process a refund is meaningfully better than one that fails immediately. It's important to represent this continuum of success in results.

</template>
<template #zh>

对于有多个组件的任务，建立部分得分机制。一个正确识别了问题并验证了客户身份但未能处理退款的支持智能体，明显比一个立即失败的智能体要好。在结果中体现这种成功的连续性很重要。

</template>
</Bilingual>

<Bilingual>
<template #en>

Model grading often takes careful iteration to validate accuracy. LLM-as-judge graders should be closely calibrated with human experts to gain confidence that there is little divergence between the human grading and model grading. To avoid hallucinations, give the LLM a way out, like providing an instruction to return "Unknown" when it doesn't have enough information. It can also help to create clear, structured rubrics to grade each dimension of a task, and then grade each dimension with an isolated LLM-as-judge rather than using one to grade all dimensions. Once the system is robust, it's sufficient to use human review only occasionally.

</template>
<template #zh>

模型评分通常需要仔细迭代来验证准确性。LLM 作为评判者的评分器应与人工专家密切校准，以建立对人工评分和模型评分之间差异很小的信心。为避免幻觉，给 LLM 一个退路，比如提供一条指令让它在信息不足时返回"Unknown"。创建清晰、结构化的评分标准来评估任务的每个维度，然后用独立的 LLM 评判器分别评估每个维度，而不是用一个评判器评估所有维度，这也很有帮助。一旦系统变得稳健，偶尔使用人工审查就足够了。

</template>
</Bilingual>

<Bilingual>
<template #en>

Some evaluations have subtle failure modes that result in low scores even with good agent performance, as the agent fails to solve tasks due to grading bugs, agent harness constraints, or ambiguity. Even sophisticated teams can miss these issues. For example, [Opus 4.5 initially scored 42% on CORE-Bench](https://x.com/sayashk/status/1996334941832089732), until an Anthropic researcher found multiple issues: rigid grading that penalized "96.12" when expecting "96.124991…", ambiguous task specs, and stochastic tasks that were impossible to reproduce exactly. After fixing bugs and using a less constrained scaffold, Opus 4.5's score jumped to 95%. Similarly, [METR discovered](https://x.com/metr_evals/status/2001473506442375645) several misconfigured tasks in their time horizon benchmark that asked agents to optimize to a stated score threshold, but the grading required exceeding that threshold. This penalized models like Claude for following the instructions, while models that ignored the stated goal received better scores. Carefully double-checking tasks and graders can help avoid these problems.

</template>
<template #zh>

一些评估有微妙的失败模式，即使智能体表现良好也会得到低分，因为智能体由于评分 bug、智能体框架约束或歧义而无法解决任务。即使是经验丰富的团队也可能忽略这些问题。例如，[Opus 4.5 在 CORE-Bench 上最初只得 42%](https://x.com/sayashk/status/1996334941832089732)，直到一位 Anthropic 研究员发现了多个问题：过于严格的评分（期望"96.124991…"时惩罚了"96.12"）、含糊的任务规格，以及无法精确复现的随机任务。修复 bug 并使用更少约束的脚手架后，Opus 4.5 的分数跃升至 95%。类似地，[METR 发现](https://x.com/metr_evals/status/2001473506442375645)其时间跨度基准中有几个配置错误的任务：要求智能体优化到规定的分数阈值，但评分却要求超过该阈值。这惩罚了 Claude 等遵循指令的模型，而忽略既定目标的模型反而得了更高分。仔细复查任务和评分器有助于避免这些问题。

</template>
</Bilingual>

<Bilingual>
<template #en>

Make your graders resistant to bypasses or hacks. The agent shouldn't be able to easily "cheat" the eval. Tasks and graders should be designed so that passing genuinely requires solving the problem rather than exploiting unintended loopholes.

</template>
<template #zh>

使你的评分器能够抵抗绕过或黑客攻击。智能体不应该能轻易地"作弊"通过评估。任务和评分器应该这样设计：通过评估真正需要解决问题，而不是利用意外的漏洞。

</template>
</Bilingual>

### Maintain and use the eval long-term

<Bilingual>
<template #en>

**Step 6: Check the transcripts**

You won't know if your graders are working well unless you read the transcripts and grades from many trials. At Anthropic, we invested in tooling for viewing eval transcripts and we regularly take the time to read them. When a task fails, the transcript tells you whether the agent made a genuine mistake or whether your graders rejected a valid solution. It also often surfaces key details about agent and eval behavior.

</template>
<template #zh>

**第 6 步：检查记录**

除非你阅读多次试验的记录和评分，否则你不会知道评分器是否运作良好。在 Anthropic，我们投入开发了查看评估记录的工具，并定期花时间阅读它们。当任务失败时，记录会告诉你智能体是犯了真正的错误，还是你的评分器拒绝了有效的解决方案。它还经常揭示关于智能体和评估行为的关键细节。

</template>
</Bilingual>

<Bilingual>
<template #en>

<mark>Failures should seem fair: it's clear what the agent got wrong and why. When scores don't climb, we need confidence that it's due to agent performance and not the eval.</mark> Reading transcripts is how you verify that your eval is measuring what actually matters, and is a critical skill for agent development.

</template>
<template #zh>

<mark>失败应该看起来是合理的：应该清楚智能体做错了什么以及为什么。当分数不上升时，我们需要确信这是因为智能体表现而非评估本身的问题。</mark>阅读记录是你验证评估是否在衡量真正重要的事情的方式，也是智能体开发的一项关键技能。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Step 7: Monitor for capability eval saturation**

An eval at 100% tracks regressions but provides no signal for improvement. **Eval saturation** occurs when an agent passes all of the solvable tasks, leaving no room for improvement. For instance, SWE-Bench Verified scores started at 30% this year, and frontier models are now nearing saturation at >80%. As evals approach saturation, progress will also slow, as only the most difficult tasks remain. This can make results deceptive, as large capability improvements appear as small increases in scores. For example, the code review startup [Qodo](https://www.qodo.ai/) was initially unimpressed by Opus 4.5 because their one-shot coding evals didn't capture the gains on longer, more complex tasks. In response, they developed a new agentic eval framework, providing a much clearer picture of progress.

</template>
<template #zh>

**第 7 步：监控能力评估饱和**

100% 通过率的评估可以追踪回归，但无法提供改进信号。**评估饱和（eval saturation）**是指智能体通过了所有可解任务，没有留下改进空间。例如，SWE-Bench Verified 今年的分数从 30% 开始，前沿模型现在已接近饱和的 >80%。随着评估接近饱和，进展也会放缓，因为只剩下最困难的任务。这可能使结果具有欺骗性，因为大的能力提升只表现为分数的小幅增长。例如，代码审查初创公司 [Qodo](https://www.qodo.ai/) 最初对 Opus 4.5 印象不深，因为他们的单次编码评估没有捕捉到在更长、更复杂任务上的提升。作为回应，他们开发了一个新的智能体评估框架，提供了更清晰的进展图景。

</template>
</Bilingual>

<Bilingual>
<template #en>

As a rule, we do not take eval scores at face value until someone digs into the details of the eval and reads some transcripts. If grading is unfair, tasks are ambiguous, valid solutions are penalized, or the harness constrains the model, the eval should be revised.

</template>
<template #zh>

作为原则，在有人深入评估细节并阅读一些记录之前，我们不会表面地接受评估分数。如果评分不公平、任务有歧义、有效解决方案被惩罚，或框架限制了模型，就应该修订评估。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Step 8: Keep evaluation suites healthy long-term through open contribution and maintenance**

An eval suite is a living artifact that needs ongoing attention and clear ownership to remain useful.

</template>
<template #zh>

**第 8 步：通过开放贡献和维护保持评估套件长期健康**

评估套件是一个活的产物，需要持续关注和明确的归属才能保持有用。

</template>
</Bilingual>

<Bilingual>
<template #en>

At Anthropic, we experimented with various approaches to eval maintenance. What proved most effective was establishing dedicated evals teams to own the core infrastructure, while domain experts and product teams contribute most eval tasks and run the evaluations themselves.

</template>
<template #zh>

在 Anthropic，我们尝试了多种评估维护方法。最有效的是建立专门的评估团队来拥有核心基础设施，而领域专家和产品团队贡献大部分评估任务并自行运行评估。

</template>
</Bilingual>

<Bilingual>
<template #en>

For AI product teams, owning and iterating on evaluations should be as routine as maintaining unit tests. Teams can waste weeks on AI features that "work" in early testing but fail to meet unstated expectations that a well-designed eval would have surfaced early. Defining eval tasks is one of the best ways to stress-test whether the product requirements are concrete enough to start building.

</template>
<template #zh>

对于 AI 产品团队，拥有和迭代评估应该像维护单元测试一样成为常规。团队可能在"在早期测试中可行"但未能满足未明确表述的期望的 AI 功能上浪费数周时间，而一个设计良好的评估本可以及早揭示这些期望。定义评估任务是压力测试产品需求是否足够具体以开始构建的最佳方式之一。

</template>
</Bilingual>

<Bilingual>
<template #en>

<mark>We recommend practicing eval-driven development: build evals to define planned capabilities before agents can fulfill them, then iterate until the agent performs well.</mark> Internally, we often build features that work "well enough" today but are bets on what models can do in a few months. Capability evals that start at a low pass rate make this visible. When a new model drops, running the suite quickly reveals which bets paid off.

</template>
<template #zh>

<mark>我们推荐实践评估驱动开发：在智能体能够实现计划能力之前，先构建评估来定义这些能力，然后迭代直到智能体表现良好。</mark>在内部，我们经常构建今天"足够好"的功能，但这是对模型几个月后能做到什么的押注。从低通过率开始的能力评估使这一点可见。当新模型发布时，运行套件可以快速揭示哪些押注得到了回报。

</template>
</Bilingual>

<Bilingual>
<template #en>

The people closest to product requirements and users are best positioned to define success. With current model capabilities, product managers, customer success managers, or salespeople can use Claude Code to contribute an eval task as a PR — let them! Or, even better, actively enable them.

</template>
<template #zh>

最接近产品需求和用户的人最适合定义成功标准。以当前模型的能力，产品经理、客户成功经理或销售人员可以使用 Claude Code 以 PR 形式贡献评估任务——让他们来！或者更好的是，主动为他们创造条件。

</template>
</Bilingual>

## How evals fit with other methods for a holistic understanding of agents

<Bilingual>
<template #en>

Automated evaluations can be run against an agent in thousands of tasks without deploying to production or affecting real users. But this is just one of many ways to understand agent performance. A complete picture includes production monitoring, user feedback, A/B testing, manual transcript review, and systematic human evaluation.

</template>
<template #zh>

自动化评估可以在数千个任务上对智能体进行测试，而无需部署到生产环境或影响真实用户。但这只是理解智能体表现的众多方式之一。完整的图景包括生产监控、用户反馈、A/B 测试、人工记录审查和系统性人类研究。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Automated evals** — *Running tests programmatically without real users*

**Pros:** Faster iteration · Fully reproducible · No user impact · Can run on every commit · Tests scenarios at scale without requiring a prod deployment

**Cons:** Requires more up-front investment to build · Requires ongoing maintenance as product and model evolves to avoid drift · Can create false confidence if it doesn't match real usage patterns

</template>
<template #zh>

**自动化评估** — *在没有真实用户的情况下以编程方式运行测试*

**优势：** 更快的迭代 · 完全可复现 · 无用户影响 · 可在每次提交时运行 · 无需生产部署即可大规模测试场景

**劣势：** 需要更多前期投入来构建 · 随产品和模型演进需要持续维护以避免漂移 · 如果不匹配真实使用模式可能产生虚假信心

</template>
</Bilingual>

<Bilingual>
<template #en>

**Production monitoring** — *Tracking metrics and errors in live systems*

**Pros:** Reveals real user behavior at scale · Catches issues that synthetic evals miss · Provides ground truth on how agents actually perform

**Cons:** Reactive; problems reach users before you know about them · Signals can be noisy · Requires investment in instrumentation · Lacks ground truth for grading

</template>
<template #zh>

**生产监控** — *在实时系统中追踪指标和错误*

**优势：** 大规模揭示真实用户行为 · 捕捉合成评估遗漏的问题 · 提供智能体实际表现的真值

**劣势：** 被动的；问题在你知道之前就已影响用户 · 信号可能有噪音 · 需要投入监测基础设施 · 缺乏评分所需的真值

</template>
</Bilingual>

<Bilingual>
<template #en>

**A/B testing** — *Comparing variants with real user traffic*

**Pros:** Measures actual user outcomes (retention, task completion) · Controls for confounds · Scalable and systematic

**Cons:** Slow; days or weeks to reach significance and requires sufficient traffic · Only tests changes you deploy · Less signal on the underlying "why" for changes in metrics without being able to thoroughly review the transcripts

</template>
<template #zh>

**A/B 测试** — *用真实用户流量比较变体*

**优势：** 衡量实际用户结果（留存、任务完成） · 控制混淆因素 · 可扩展且系统化

**劣势：** 缓慢；需要数天或数周达到显著性且需要足够流量 · 只测试你部署的变更 · 在无法彻底审查记录的情况下，对指标变化背后的"为什么"信号较少

</template>
</Bilingual>

<Bilingual>
<template #en>

**User feedback** — *Explicit signals like thumbs-down or bug reports*

**Pros:** Surfaces problems you didn't anticipate · Comes with real examples from actual human users · The feedback often correlates with product goals

**Cons:** Sparse and self-selected · Skews toward severe issues · Users rarely explain *why* something failed · Not automated · Relying primarily on users to catch issues can have negative user impact

</template>
<template #zh>

**用户反馈** — *明确的信号如点踩或 bug 报告*

**优势：** 发现你未曾预料的问题 · 附带来自真实用户的实际案例 · 反馈通常与产品目标相关

**劣势：** 稀疏且自我选择 · 偏向严重问题 · 用户很少解释某事*为什么*失败 · 非自动化 · 主要依赖用户来发现问题可能对用户产生负面影响

</template>
</Bilingual>

<Bilingual>
<template #en>

**Manual transcript review** — *Humans reading through agent conversations*

**Pros:** Builds intuition for failure modes · Catches subtle quality issues automated checks miss · Helps calibrate what "good" looks like and grasp details

**Cons:** Time-intensive · Doesn't scale · Coverage is inconsistent · Reviewer fatigue or different reviewers can affect the signal quality · Typically only gives qualitative signal rather than clear quantitative grading

</template>
<template #zh>

**人工记录审查** — *人类阅读智能体对话*

**优势：** 建立对失败模式的直觉 · 捕捉自动化检查遗漏的细微质量问题 · 帮助校准"好"是什么样的并掌握细节

**劣势：** 耗时 · 不可扩展 · 覆盖不一致 · 审查者疲劳或不同审查者可能影响信号质量 · 通常只给出定性信号而非清晰的定量评分

</template>
</Bilingual>

<Bilingual>
<template #en>

**Systematic human studies** — *Structured grading of agent outputs by trained raters*

**Pros:** Gold-standard quality judgements from multiple human raters · Handles subjective or ambiguous tasks · Provides signal for improving model-based graders

**Cons:** Relatively expensive and slow turnaround · Hard to run frequently · Inter-rater disagreement requires reconciliation · Complex domains (legal, finance, healthcare) require human experts to conduct studies

</template>
<template #zh>

**系统性人类研究** — *由训练有素的评分者对智能体输出进行结构化评分*

**优势：** 来自多个人工评分者的黄金标准质量判断 · 处理主观或含糊的任务 · 为改进基于模型的评分器提供信号

**劣势：** 相对昂贵且周转慢 · 难以频繁运行 · 评分者间分歧需要调解 · 复杂领域（法律、金融、医疗）需要人类专家来进行研究

</template>
</Bilingual>

<Bilingual>
<template #en>

These methods map to different stages of agent development. Automated evals are especially useful pre-launch and in CI/CD, running on each agent change and model upgrade as the first line of defense against quality problems. Production monitoring kicks in post-launch to detect distribution drift and unanticipated real-world failures. A/B testing validates significant changes once you have sufficient traffic. User feedback and transcript review are ongoing practices to fill the gaps: triage feedback constantly, sample transcripts to read weekly, and dig deeper as needed. Reserve systematic human studies for calibrating LLM graders or evaluating subjective outputs where human consensus serves as the reference standard.

</template>
<template #zh>

这些方法对应智能体开发的不同阶段。自动化评估在发布前和 CI/CD 中特别有用，在每次智能体变更和模型升级时运行，作为防范质量问题的第一道防线。生产监控在发布后启动，用于检测分布漂移和未预料的真实世界故障。A/B 测试在有足够流量后验证重大变更。用户反馈和记录审查是填补空白的持续实践：不断分类反馈、每周抽样阅读记录，并在需要时深入挖掘。将系统性人类研究留给校准 LLM 评分器或评估主观输出——在这些场景中，人类共识作为参考标准。

</template>
</Bilingual>

<Bilingual>
<template #en>

<mark>Like the Swiss Cheese Model from safety engineering, no single evaluation layer catches every issue. With multiple methods combined, failures that slip through one layer are caught by another.</mark> The most effective teams combine these methods: automated evals for fast iteration, production monitoring for ground truth, and periodic human review for calibration.

</template>
<template #zh>

<mark>就像安全工程中的瑞士奶酪模型，没有任何单一评估层能捕捉所有问题。多种方法组合后，从一个层滑过的失败会被另一个层捕捉到。</mark>最有效的团队组合使用这些方法：自动化评估用于快速迭代，生产监控用于获取真值，定期人工审查用于校准。

</template>
</Bilingual>

## Conclusion

<Bilingual>
<template #en>

<mark>Teams without evals get bogged down in reactive loops — fixing one failure, creating another, unable to distinguish real regressions from noise. Teams that invest early find the opposite: development accelerates as failures become test cases, test cases prevent regressions, and metrics replace guesswork.</mark> Evals give the whole team a clear hill to climb, turning "the agent feels worse" into something actionable. The value compounds, but only if you treat evals as a core component, not an afterthought.

</template>
<template #zh>

<mark>没有评估的团队会陷入被动循环——修复一个故障又引入另一个，无法区分真正的回归和噪音。尽早投入的团队则恰恰相反：随着故障变成测试用例、测试用例防止回归、指标取代猜测，开发加速了。</mark>评估给整个团队一座明确的山峰去攀登，将"智能体变差了"变成可操作的信息。其价值会复利增长，但前提是你把评估视为核心组件，而非事后补充。

</template>
</Bilingual>

<Bilingual>
<template #en>

The patterns vary by agent type, but the fundamentals described here are constant. Start early and don't wait for the perfect suite. Source realistic tasks from the failures you see. Define unambiguous, robust success criteria. Design graders thoughtfully and combine multiple types. Make sure the problems are hard enough for the model. Iterate on the evaluations to improve their signal-to-noise ratio. **Read the transcripts!**

</template>
<template #zh>

模式因智能体类型而异，但这里描述的基本原则是不变的。尽早开始，不要等待完美的套件。从你看到的故障中提取真实任务。定义无歧义、稳健的成功标准。精心设计评分器并组合多种类型。确保问题对模型来说足够难。迭代评估以提高信噪比。**阅读记录！**

</template>
</Bilingual>

<Bilingual>
<template #en>

AI agent evaluation is still a nascent, fast-evolving field. As agents take on longer tasks, collaborate in multi-agent systems, and handle increasingly subjective work, we will need to adapt our techniques. We'll keep sharing best practices as we learn more.

</template>
<template #zh>

AI 智能体评估仍是一个新兴、快速演进的领域。随着智能体承担更长的任务、在多智能体系统中协作，以及处理越来越主观的工作，我们将需要调整我们的技术。随着我们学到更多，我们会继续分享最佳实践。

</template>
</Bilingual>

## Acknowledgements

<Bilingual>
<template #en>

Written by Mikaela Grace, Jeremy Hadfield, Rodrigo Olivares, and Jiri De Jonghe. We're also grateful to David Hershey, Gian Segato, Mike Merrill, Alex Shaw, Nicholas Carlini, Ethan Dixon, Pedram Navid, Jake Eaton, Alyssa Baum, Lina Tawfik, Karen Zhou, Alexander Bricken, Sam Kennedy, Robert Ying, and others for their contributions. Special thanks to the customers and partners we have learned from through collaborating on evals, including iGent, Cognition, Bolt, Sierra, Vals.ai, Macroscope, PromptLayer, Stripe, Shopify, the Terminal Bench team, and more. This work reflects the collective efforts of several teams who helped develop the practice of evaluations at Anthropic.

</template>
<template #zh>

作者：Mikaela Grace、Jeremy Hadfield、Rodrigo Olivares 和 Jiri De Jonghe。我们还感谢 David Hershey、Gian Segato、Mike Merrill、Alex Shaw、Nicholas Carlini、Ethan Dixon、Pedram Navid、Jake Eaton、Alyssa Baum、Lina Tawfik、Karen Zhou、Alexander Bricken、Sam Kennedy、Robert Ying 等人的贡献。特别感谢我们通过评估合作学习到的客户和合作伙伴，包括 iGent、Cognition、Bolt、Sierra、Vals.ai、Macroscope、PromptLayer、Stripe、Shopify、Terminal Bench 团队等。这项工作反映了帮助发展 Anthropic 评估实践的多个团队的集体努力。

</template>
</Bilingual>

## Appendix: Eval frameworks

<Bilingual>
<template #en>

Several open-source and commercial frameworks can help teams implement agent evaluations without building infrastructure from scratch. The right choice depends on your agent type, existing stack, and whether you need offline evaluation, production observability, or both.

</template>
<template #zh>

几个开源和商业框架可以帮助团队实现智能体评估，而无需从零构建基础设施。正确的选择取决于你的智能体类型、现有技术栈，以及你是否需要离线评估、生产可观测性，或两者都需要。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Harbor** is designed for running agents in containerized environments, with infrastructure for running trials at scale across cloud providers and a standardized format for defining tasks and graders. Popular benchmarks like Terminal-Bench 2.0 ship through the Harbor registry, making it easy to run established benchmarks along with custom eval suites.

</template>
<template #zh>

**Harbor** 专为在容器化环境中运行智能体而设计，提供跨云提供商大规模运行试验的基础设施，以及定义任务和评分器的标准化格式。Terminal-Bench 2.0 等热门基准通过 Harbor 注册表发布，使运行既有基准和自定义评估套件变得简单。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Braintrust** is a platform that combines offline evaluation with production observability and experiment tracking — useful for teams that need to both iterate during development and monitor quality in production. Its `autoevals` library includes pre-built scorers for factuality, relevance, and other common dimensions.

</template>
<template #zh>

**Braintrust** 是一个结合离线评估、生产可观测性和实验追踪的平台——适用于需要在开发期间迭代同时在生产中监控质量的团队。其 `autoevals` 库包含用于事实性、相关性等常见维度的预构建评分器。

</template>
</Bilingual>

<Bilingual>
<template #en>

**LangSmith** offers tracing, offline and online evaluations, and dataset management with tight integration into the LangChain ecosystem.

**Langfuse** provides similar capabilities as a self-hosted open-source alternative for teams with data residency requirements.

**Arize** offers Phoenix, an open-source platform for LLM tracing, debugging, and offline or online evaluations, and AX, a SaaS offering that extends Phoenix for scale, optimization and monitoring.

</template>
<template #zh>

**LangSmith** 提供追踪、离线和在线评估，以及数据集管理，与 LangChain 生态系统紧密集成。

**Langfuse** 提供类似功能，作为满足数据驻留需求的团队的自托管开源替代方案。

**Arize** 提供 Phoenix，一个用于 LLM 追踪、调试和离线/在线评估的开源平台，以及 AX，一个扩展 Phoenix 以实现规模化、优化和监控的 SaaS 产品。

</template>
</Bilingual>

<Bilingual>
<template #en>

<mark>Many teams combine multiple tools, roll their own eval framework, or just use simple evaluation scripts as a starting point. We find that while frameworks can be a valuable way to accelerate progress and standardize, they're only as good as the eval tasks you run through them. It's often best to quickly pick a framework that fits your workflow, then invest your energy in the evals themselves by iterating on high-quality test cases and graders.</mark>

</template>
<template #zh>

<mark>许多团队组合使用多种工具、自建评估框架，或仅使用简单的评估脚本作为起点。我们发现，虽然框架可以成为加速进展和标准化的宝贵方式，但它们的效果取决于你通过它们运行的评估任务。通常最好的做法是快速选择一个适合你工作流的框架，然后通过迭代高质量测试用例和评分器将精力投入到评估本身。</mark>

</template>
</Bilingual>
