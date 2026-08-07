---
title: Understanding Rethlas and Archon
date: 2026-08-07
summary: An overview of the Rethlas and Archon and their design principles.
tags:
  - Agent Design
  - Autoformalization
---

# Understanding Rethlas and Archon

Rethlas 和 Archon 是北大董斌老师团队开源的两个关于自动数学定理证明的 agent。Rethlas 负责用自然语言完成数学定理的证明，Archon 负责用 lean 对数学定理及其证明进行形式化。Rethlas 和 Archon 在一些数学问题上取得了进展。本文对两个 agent 的设计做一个概述，并简要分析其设计原则。

## Rethlas

Rethlas 是一个基于自然语言的数学定理证明系统。它不依赖 Lean 等定理证明器进行形式化验证，而是完全在自然语言层面完成数学定理的证明与审查。系统的核心是两个 Codex Agent——一个负责生成证明，另一个负责验证证明——它们通过 HTTP 通信，形成「写→审→改→再审」的循环，直到证明通过验证。

### 整体架构

Rethlas 的架构是「双 Agent + MCP 工具层 + Bash 编排器」：

```
用户放一道数学题 (markdown)
      │
      ▼
┌──────────────────────────────┐
│    生成 Agent (Generation)     │
│  Codex CLI + MCP 工具服务器     │
│                               │
│  1. 读题目                      │
│  2. 搜索相关定理 (arXiv)         │
│  3. 构造例子/反例                │
│  4. 分解子目标                   │
│  5. 逐步证明                    │
│  6. 写出 blueprint.md           │
│  7. 调用验证服务 ←── HTTP ───┐  │
│  8. 验证失败则修改后重试       │  │
│  9. 验证通过 → blueprint_verified.md
└─────────────────────────────│──┘
                    POST /verify
                              │
┌─────────────────────────────▼──┐
│    验证 Agent (Verification)     │
│  FastAPI HTTP 服务 + Codex CLI   │
│                                │
│  1. 收到 (statement, proof)     │
│  2. 生成 run_id                 │
│  3. 启动 Codex 子进程来验证      │
│  4. 逐句检查 + 检查外部引用      │
│  5. 输出 verification.json      │
│  6. 返回 verdict + repair_hints │
└─────────────────────────────────┘
```

<Bilingual>
<template #en>

The system runs on [OpenAI's Codex CLI](https://github.com/openai/codex). Both the generation agent and the verification agent are Codex sessions driven by the same model (`gpt-5.6-sol`, reasoning effort = `max`). The generation agent is launched directly via `codex exec`, while the verification agent is wrapped in a FastAPI HTTP service that internally spawns a Codex subprocess for each verification request.

</template>
<template #zh>

系统运行在 [OpenAI 的 Codex CLI](https://github.com/openai/codex) 之上。生成 Agent 和验证 Agent 都是由同一模型（`gpt-5.6-sol`，reasoning effort = `max`）驱动的 Codex 会话。生成 Agent 通过 `codex exec` 直接启动，而验证 Agent 则被封装在一个 FastAPI HTTP 服务中，每收到一个验证请求就内部启动一个 Codex 子进程来处理。

</template>
</Bilingual>

### 生成 Agent：自适应控制循环

生成 Agent 的行为完全由 `AGENTS.md` 文件定义。这个文件是 Codex 的「行为剧本」——Codex 启动后读取它，照着里面的指令行事。

<Bilingual>
<template #en>

The generation agent's `AGENTS.md` defines an **adaptive control loop** with four steps that repeat until the proof passes verification:

</template>
<template #zh>

生成 Agent 的 `AGENTS.md` 定义了一个**自适应控制循环**，包含四个步骤，不断重复直到证明通过验证：

</template>
</Bilingual>

<Bilingual>
<template #en>

> **Step 1: Assess state** (every iteration) — What is the current main problem? Have we searched extensively? What decomposition plans have been tried? What failures have been identified?
>
> **Step 2: Choose the next skill(s)** — Adaptively select skills based on current state, not a fixed order.
>
> **Step 3: Act and persist** — Execute the chosen skill, persist all artifacts to memory channels.
>
> **Step 4: Stopping rules** — Stop only when the blueprint passes verification and `blueprint_verified.md` is produced.

</template>
<template #zh>

> **第1步：评估状态**（每轮迭代）——当前要解决的主要问题是什么？是否已经进行了大量搜索？尝试过哪些分解方案？识别出了哪些失败？
>
> **第2步：选择下一个技能**——根据当前状态自适应地选择技能，而非固定顺序。
>
> **第3步：执行并持久化**——执行所选技能，将所有产物持久化到记忆通道。
>
> **第4步：停止规则**——仅在蓝图通过验证且产出 `blueprint_verified.md` 时停止。

</template>
</Bilingual>

这个循环的关键在「自适应」——Agent 不走固定的技能调用顺序，而是每轮重新评估当前状态，挑最合适的技能。这更像真实数学家的工作方式：遇到不同类型的困难，换不同的策略。

### 十个技能

生成 Agent 拥有 10 个技能（Skill），每个技能定义在 `.agents/skills/` 下的独立 `SKILL.md` 文件中：

| 技能 | 功能 | 触发时机 |
|---|---|---|
| `obtain-immediate-conclusions` | 从定理陈述直接推导显然结论 | 刚开始/新分支/新子目标 |
| `search-math-results` | 搜索 arXiv 定理库 + 网络搜索 | 需要背景知识、相关定理 |
| `query-memory` | 在之前保存的记忆中 BM25 搜索 | 想查看之前的结论/反例 |
| `construct-toy-examples` | 构造满足条件的简单例子 | 卡住了，需要直觉 |
| `construct-counterexamples` | 构造反例测试中间结论 | 怀疑某个中间结论是错的 |
| `propose-subgoal-decomposition-plans` | 把大定理拆成多个子目标 | 积累了足够信息后 |
| `direct-proving` | 直接尝试证明分解方案的子目标 | 有分解方案了 |
| `recursive-proving` | 派子 Agent 并行证明不同方案 | 直接证明全部失败后 |
| `identify-key-failures` | 总结所有失败的共同原因 | 递归证明也失败后 |
| `verify-proof` | 调用验证服务检查完整证明 | 证明写完了 |

典型的证明流程如下：

```
读题 → obtain-immediate-conclusions (推出直接结论)
     → search-math-results (搜索相关定理)
     → construct-toy-examples (构造简单例子)
     → construct-counterexamples (测试中间猜测)
     → propose-subgoal-decomposition-plans (提出多个分解方案)
     → direct-proving (尝试直接证明每个方案)
     → [失败] recursive-proving (派子Agent并行证明)
     → [还失败] identify-key-failures (总结失败原因)
     → propose-subgoal-decomposition-plans (重新规划)
     → ... (循环直到证明完成)
     → verify-proof (验证)
     → [验证失败] 修改 → 重新验证
     → [验证通过] 完成!
```

#### `recursive-proving` 技能

<mark>十个技能里，`recursive-proving` 最特别。</mark> 当所有分解方案在直接证明中都失败后，生成 Agent 会为每个分解方案派生一个子 Agent，让它们并行工作。每个子 Agent 拿到完整的定理、分配的分解方案、自己方案的卡点以及其他方案的卡点，然后独立尝试证明。子 Agent 还能递归地再派生自己的子 Agent。

Codex 的配置层面也支持这一点：

```toml
# .codex/config.toml
[features]
multi_agent = true

[agents]
max_threads = 10        # 最多 10 个并行子 Agent
max_depth = 3           # 递归深度最多 3 层
job_max_runtime_seconds = 3600  # 每个子 Agent 最多跑 1 小时
```

同时还为它定义了一个专门的子 Agent 配置：

```toml
# .codex/agents/subgoal-prover.toml
name = "subgoal-prover"
description = "An agent that try to prove all the subgoals in a subgoal decomposition plan."
model = "gpt-5.6-sol"
model_reasoning_effort = "max"
developer_instructions = """
You are a subgoal prover agent. Your task is to prove all the subgoals
in a subgoal decomposition plan. You follow AGENTS.md to work on this
task. If you cannot prove all the subgoals, please summarize the
subgoals that you have proved and the subgoals that you have not proved,
and explain the reasons why you cannot prove the remaining subgoals.
"""
```

<Bilingual>
<template #en>

> You are a subgoal prover agent. Your task is to prove all the subgoals in a subgoal decomposition plan. You follow AGENTS.md to work on this task. If you cannot prove all the subgoals, please summarize the subgoals that you have proved and the subgoals that you have not proved, and explain the reasons why you cannot prove the remaining subgoals.

</template>
<template #zh>

> 你是一个子目标证明 Agent。你的任务是证明一个子目标分解方案中的所有子目标。你遵循 AGENTS.md 来完成此任务。如果你无法证明所有子目标，请总结你已经证明的子目标和尚未证明的子目标，并解释你无法证明剩余子目标的原因。

</template>
</Bilingual>

### 记忆系统：JSONL 文件 + BM25 搜索

生成 Agent 拥有一个基于文件的记忆系统，由 MCP（Model Context Protocol）服务器 `mcp/server.py` 提供。所有中间推理产物都以 JSONL 格式持久化到磁盘上。

记忆按通道（channel）组织，每个通道是一个 `.jsonl` 文件：

```
memory/{problem_id}/
├── meta.json                      # 元数据
├── immediate_conclusions.jsonl    # 直接结论
├── toy_examples.jsonl             # 玩具例子
├── counterexamples.jsonl          # 反例
├── big_decisions.jsonl            # 重要决策
├── subgoals.jsonl                 # 子目标/分解方案
├── proof_steps.jsonl              # 证明步骤
├── failed_paths.jsonl             # 失败路径
├── verification_reports.jsonl     # 验证报告
├── branch_states.jsonl            # 分支状态
└── events.jsonl                   # 事件日志
```

<mark>`memory_search` 工具实现了完整的 BM25 算法</mark>（参数 `k1=1.5, b=0.75`），而不是简单的字符串匹配。Agent 可以用自然语言查询之前的推理记录，相当于一个迷你搜索引擎。

MCP 服务器提供了 6 个工具供 Codex 调用：

| 工具 | 功能 |
|---|---|
| `memory_init` | 初始化记忆目录 |
| `memory_append` | 向某个通道追加记录 |
| `memory_search` | BM25 搜索记忆 |
| `branch_update` | 更新分支状态 |
| `search_arxiv_theorems` | 搜索 arXiv 定理（调用 `leansearch.net` API） |
| `verify_proof_service` | 调用验证 Agent 的 HTTP 服务 |

### 验证 Agent：FastAPI 外壳 + Codex 内核

验证 Agent 的架构比较特殊——它是一个 HTTP 服务外壳，内部却还是 Codex。

<Bilingual>
<template #en>

The verification agent is exposed as a FastAPI HTTP service with a single `/verify` endpoint. When a request arrives, it does **not** check the proof with rules or a theorem prover. Instead, it constructs a prompt, spawns a `codex exec` subprocess, and waits for that Codex session to produce a `verification.json` file. The Codex subprocess reads `verification/AGENTS.md` and follows the verification workflow defined there.

</template>
<template #zh>

验证 Agent 以 FastAPI HTTP 服务的形式暴露，只有一个 `/verify` 端点。当请求到达时，它**不是**用规则或定理证明器来检查证明，而是构造一个提示词，启动一个 `codex exec` 子进程，等待该 Codex 会话产出 `verification.json` 文件。Codex 子进程读取 `verification/AGENTS.md`，按照其中定义的验证流程行事。

</template>
</Bilingual>

验证 Agent 的 API 层代码（`api/server.py`）核心逻辑非常简洁：

```python
@app.post("/verify")
def verify(request: VerifyRequest):
    run_id = _allocate_run_id(request.statement)
    return run_codex_verification(
        run_id=run_id,
        statement=request.statement,
        proof=request.proof,
    )
```

它收到的请求会拼成以下 Codex 提示词：

<Bilingual>
<template #en>

> Run_id: {run_id}. Statement: {statement}. Proof:
> {proof}
>
> Use AGENTS.md to verify the above proof for the statement.

</template>
<template #zh>

> Run_id: {run_id}. Statement: {statement}. Proof:
> {proof}
>
> 使用 AGENTS.md 来验证上述陈述的证明。

</template>
</Bilingual>

验证 Agent 内部按顺序使用三个技能：

1. **`verify-sequential-statements`**——逐句检查证明的逻辑有效性、定理应用是否正确、有没有跳步。
2. **`check-referenced-statements`**——对每个引用的外部定理，用 `search_arxiv_theorems` 查证是否存在、定义是否匹配、是否用对了上下文。
3. **`synthesize-verification-report`**——汇总所有错误和间隙，做出判决。

<mark>验证判决规则极为严格：当且仅当 `critical_errors` 和 `gaps` 都为空时才判 `correct`，否则判 `wrong`。没有任何中间状态。</mark>

判决结果有 JSON Schema 验证（`schemas/verification_output.schema.json`），还会检查逻辑一致性——比如 verdict=correct 但有 errors 就会被拒绝写入。

### 外层编排：搜索与思考的交替

整个系统的最外层是一个 Bash 脚本 `run_example.sh`，控制着生成 Agent 的迭代循环。这个脚本有个有意思的设计：**搜索与独立思考的交替**。

```
第0轮: 全新启动 Codex（有搜索）
第1轮: 恢复 session，禁用搜索 → 强迫 AI 自己想
第2轮: 恢复 session，启用搜索 → 允许 AI 查资料
第3轮: 禁用搜索 → 自己想
第4轮: 启用搜索 → 查资料
...
```

奇数轮的提示词是：

<Bilingual>
<template #en>

> Please continue. Do not use search tools like arxiv theorem search or web search. Please think deeply by yourself.

</template>
<template #zh>

> 请继续。不要使用 arxiv 定理搜索或网络搜索等搜索工具。请自己深度思考。

</template>
</Bilingual>

偶数轮的提示词是：

<Bilingual>
<template #en>

> Please continue. You may now use search tools, such as arXiv theorem search and web search, during your reasoning, but please also think deeply by yourself.

</template>
<template #zh>

> 请继续。你现在可以在推理过程中使用搜索工具，如 arXiv 定理搜索和网络搜索，但也请自己深度思考。

</template>
</Bilingual>

<mark>这个设计防止 AI 过度依赖外部搜索。所有轮次都在同一个 Codex session 中进行，上下文完整不断。</mark>第0轮全新启动时的提示词为：

<Bilingual>
<template #en>

> Use AGENTS.md exactly to solve the math problem in ${PROBLEM_FILE}. Use problem_id=${problem_rel}. Use reference_dir=${ref_dir} if it exists.

</template>
<template #zh>

> 严格按照 AGENTS.md 来解决 ${PROBLEM_FILE} 中的数学问题。使用 problem_id=${problem_rel}。如果存在的话，使用 reference_dir=${ref_dir}。

</template>
</Bilingual>

循环在 `blueprint_verified.md` 文件出现时停止，或者在达到 `MAX_ITERATIONS`（默认 10）时失败退出。

### 外部定理搜索

两个 Agent 都使用 `search_arxiv_theorems` 工具来搜索相关数学定理。这个工具调用的是 [leansearch.net](https://leansearch.net/thm/search) 的 API，搜索任务描述为：

<Bilingual>
<template #en>

> Given a math statement, retrieve useful references, such as theorems, lemmas, and definitions, that are useful for solving the given problem.

</template>
<template #zh>

> 给定一个数学陈述，检索有用的参考文献，如定理、引理和定义，这些文献对解决给定问题有用。

</template>
</Bilingual>

<mark>虽然这个工具调用了 leansearch.net——一个与 Lean 定理证明器相关的服务——但它只是一个定理搜索引擎，帮 Agent 找到相关定理作参考。整个证明过程仍然是自然语言的，不涉及任何 Lean 形式化。</mark>

### 设计原则分析

总结下来，Rethlas 有几个核心设计原则：

**1. 自然语言层面的证明与验证。** Rethlas 不依赖形式化验证器（如 Lean/Coq），而在自然语言层面完成证明的生成和审查。生成 Agent 写人类可读的 markdown 证明，验证 Agent 也是用 LLM 逐句审查。好处是不需要把问题形式化，但验证的可靠性也就受限于 LLM 的推理能力。

**2. 自适应技能选择而非固定流水线。** 生成 Agent 不走固定的证明流程，而是每轮评估当前状态后挑最合适的技能。这更像真实数学家的工作方式，但也更考验 Agent 的自我评估能力。

**3. 结构化的持久记忆。** 所有中间推理产物都持久化到文件系统的 JSONL 通道中，通过 BM25 搜索实现检索。Agent 可以跨轮次复用之前的推理成果——失败路径、反例、结论等——不会重复犯错。

**4. 严格的验证标准。** 验证 Agent 采用「零错误零间隙」的判决规则，任何错误或间隙都判 wrong。验证输出有 JSON Schema 和逻辑一致性双重校验。

**5. 搜索与思考的强制交替。** 在 Bash 编排层强制交替启用和禁用搜索，不让 Agent 过度依赖外部检索，逼它自己深度推理。

**6. 多 Agent 并行尝试不同策略。** `recursive-proving` 技能为每个分解方案派生子 Agent 并行工作（最多 10 线程 × 3 层深度），算力够的话能大幅加速证明探索。

## Archon

Archon 是一个自主形式化研究级数学的 Agent 系统。与 Rethlas 不同，Archon 的目标是将数学定理及其证明形式化为 Lean 4 代码——每一步证明都要过 Lean 编译器的机械验证。核心思路是**将"想"和"做"分离**：一个 Plan Agent 负责战略规划（写非正式数学蓝图、分配任务），多个 Prover Agent 负责执行（写 Lean 证明代码），一个 Review Agent 负责审计。三者循环往复，直到所有定理证完。

### 整体架构

Archon 的架构是「三层循环 + 确定性脚手架 + 可互换引擎」：

```
                    archon loop .
                         │
          ┌──────────────▼──────────────┐
          │     LoopCommand (编排器)      │
          │   Python CLI + 确定性阶段      │
          │                              │
          │  ┌─ PlanPhase ──────────────┐ │     每轮迭代:
          │  │  注入上下文 → Plan Agent  │ │     iter-NNN/
          │  │  ← 子Agent (并行阻塞调度) │ │
          │  └──────────────────────────┘ │
          │  ┌─ plan_validate ──────────┐ │
          │  │  解析 PROGRESS.md 目标    │ │
          │  └──────────────────────────┘ │
          │  ┌─ ProverPhase ────────────┐ │
          │  │  serial / parallel /     │ │
          │  │  multilane (多提供商竞争)  │ │
          │  └──────────────────────────┘ │
          │  ┌─ sync_leanok (确定性)     ┐ │
          │  ├─ blueprint-doctor (确定性)┤ │
          │  ├─ axiom_sweep (可选)       ┤ │
          │  └──────────────────────────┘ │
          │  ┌─ ReviewPhase ────────────┐ │
          │  │  审计 → proof journal     │ │
          │  └──────────────────────────┘ │
          │  ┌─ FinalizePhase ──────────┐ │
          │  │  inner-git 提交 + 编译    │ │
          │  └──────────────────────────┘ │
          └──────────────────────────────┘
                         │
                    循环直到 COMPLETE
```

<Bilingual>
<template #en>

Archon runs on [Claude Code](https://claude.com/product/claude-code) (and, since v0.3.0, [Codex](https://github.com/openai/codex) as an alternative harness). Unlike Rethlas's two-agent natural-language loop, Archon orchestrates **four distinct agent roles** through a **plan → prove → review** loop that can run for dozens of iterations over a multi-file Lean project. The key insight is separating *strategic analysis* (the plan agent) from *tactical execution* (prover agents) to avoid context explosion — a single LLM conversation cannot hold the full state of a research-level formalization project.

</template>
<template #zh>

Archon 运行在 [Claude Code](https://claude.com/product/claude-code) 之上（自 v0.3.0 起也支持 [Codex](https://github.com/openai/codex) 作为替代引擎）。与 Rethlas 的双 Agent 自然语言循环不同，Archon 通过一个 **plan → prove → review** 循环来编排**四种不同的 Agent 角色**，这个循环可以在一个多文件 Lean 项目上跑数十轮迭代。关键在于把*战略分析*（Plan Agent）和*战术执行*（Prover Agent）拆开，避免上下文爆炸——单个 LLM 对话装不下研究级形式化项目的全部状态。

</template>
</Bilingual>

### 三层循环

<mark>Archon 最关键的是三层嵌套的循环结构。</mark>理解了这个，就理解了整个系统：

| 层级 | 范围 | 执行者 | 核心文件 |
|------|------|--------|----------|
| **外层循环**（Archon Loop） | 整个项目，多轮迭代 | Python 编排器 | `commands/loop/command.py` |
| **阶段循环**（Phase） | 一轮迭代内 | Plan→Prover→Review | `commands/loop/phases/*.py` |
| **内层循环**（Cycle Engine） | 一个 Prover 证一个文件 | Lean4 技能 | `skills/lean4/.../cycle-engine.md` |

**外层循环**是 Python 写的编排器，控制「第几轮迭代」，由 `LoopCommand` 类驱动。**阶段循环**是每轮迭代内的 plan→prove→review 流程，每个阶段是一个 `Phase` 子类。**内层循环**是 Prover Agent 在证一个文件时运行的自己的小循环（发现 sorry → 搜索 Mathlib → 尝试证明 → 检查 → 重新规划），这是 Lean4 技能自身的一部分。

### 四种 Agent 角色

系统的行为规则全部定义在 `AGENTS.md` 中——这是所有 Agent 的「宪法」。它定义了四种角色和严格的文件权限矩阵：

<Bilingual>
<template #en>

> You are one of: the plan agent, a prover agent, a subagent (per descriptor in `.archon/subagents/`), or the review agent. Read `PROGRESS.md` to determine your role and current objectives.

</template>
<template #zh>

> 你是以下角色之一：Plan Agent、Prover Agent、子 Agent（根据 `.archon/subagents/` 中的描述符），或 Review Agent。阅读 `PROGRESS.md` 来确定你的角色和当前目标。

</template>
</Bilingual>

| 角色 | 职责 | 能做 | 不能做 |
|------|------|------|--------|
| **Plan Agent** | 战略规划，分配任务 | 写 `PROGRESS.md`、`STRATEGY.md`、蓝图 `.tex`、调度子 Agent | **永远不写 Lean 代码、不填 sorry** |
| **Prover Agent** | 执行证明 | 编辑自己的 `.lean` 文件、写 `task_results/` 报告 | 编辑别人的文件、编辑蓝图 |
| **Review Agent** | 审计结果 | 写 proof journal、维护 `\mathlibok` 标记、调度审计子 Agent | 写证明、编辑 `.lean`、改 `PROGRESS.md` |
| **Subagents** | 专注的帮手 | 带全新上下文做特定任务 | 默认关闭，用户选择启用 |

<mark>Plan Agent 的输出是「数学意图」，Prover Agent 的输出是 Lean 语法——两者绝不交叉。</mark>这种分离防止了上下文爆炸，也让每个 Agent 只管自己那一摊。

### 主循环的执行流程

`archon loop` 命令的入口在 `entry.py`，解析 CLI 参数后构建 `LoopOptions`，然后调用 `LoopCommand.run()`。核心的迭代逻辑在 `command.py` 的 `_run_iteration` 方法中：

```python
# commands/loop/command.py: LoopCommand._run_iteration()
# 一轮迭代的完整执行顺序

def _run_iteration(self, i: int) -> bool:
    """运行一轮迭代。返回 False 则外层循环应停止。"""
    # 0. 准备：创建迭代目录，初始化信号量
    self._setup_iteration_dir(i)

    # 1. Plan 阶段 —— Plan Agent 制定策略
    if PlanPhase(ctx).run().completed:
        return False  # PROGRESS.md 标记 COMPLETE

    # 1b. 验证 Plan 的输出（确定性检查）
    if not plan_validate.validate_plan_output(ctx):
        # PROGRESS.md 解析失败 → 写 AUTO_NOTES，跳过本轮 prover
        return True

    # 2. Prover 阶段 —— 多个 Prover 并行证明（最长的阶段）
    ProverPhase(ctx).run()

    # 2b. 确定性 sync_leanok（无 Agent，自动同步标记）
    SyncLeanokPhase(ctx).run()

    # 2c. Blueprint Doctor（确定性结构检查）
    BlueprintDoctorPhase(ctx).run()

    # 2d. Axiom Sweep（可选，检测 sorryAx 洗钱）
    AxiomSweepPhase(ctx).run()

    # 3. Review 阶段 —— Review Agent 审计结果
    ReviewPhase(ctx).run()

    # 4. 收尾 —— inner-git 提交 + lake build + 费用汇总
    self._post_phases_sorry_count()
    FinalizePhase(ctx).run()

    return True
```

项目阶段在 `PROGRESS.md` 中跟踪，按以下顺序推进：`init → autoformalize → prover → polish → COMPLETE`

| 阶段 | 做什么 | 使用的 prover mode |
|------|--------|-------------------|
| `autoformalize` | 把非正式数学翻译成带 sorry 的 Lean 声明 | `formalize` |
| `prover` | 填 sorry，写真证明 | `prove`/`fine-grained`/`mathlib-build` |
| `polish` | golf（压缩证明）、重构、提取引理 | `golf`/`polish` |

### 确定性上下文注入

<mark>Archon 的一个核心原则是：任何循环能确定性完成的事情（读文件、跑检查、算摘要），都由循环自己注入到 Agent 的 prompt 中，不让 Agent 自己去读。</mark>Agent 只管判断，不用做机械性的文件操作。

Plan Agent 的 prompt 由 `prompts.py` 中的 `build_plan_prompt()` 函数构建，它会注入以下上下文：

- `USER_HINTS.md` 的内容（注入后由循环清理，Agent 不需要自己读或清理）
- 上一轮的 `blueprint-doctor` 发现（孤儿章节、断裂引用、新 axiom）
- 最近几轮的 `sidecar`（plan.md / review.md，提供跨轮次连续性）
- 子 Agent 目录（可用子 Agent 的名称、描述、权限）
- leandag 依赖图状态（哪些定理可以开始证明了）
- 参考文献摘要（`references/summary.md`）

<Bilingual>
<template #en>

> Everything here is already in your prompt; do NOT "go read" the files.
>
> - **User hints** from `USER_HINTS.md` (cleared after your phase succeeds).
> - **Blueprint-doctor findings** from the prior iter (orphan chapters, broken `\ref`/`\uses`, new axioms).
> - **Recent iter sidecars** (last few iters' `plan.md` / `review.md`), the **prover-modes catalog**, the **leandag graph state**, and the **references summary**.
> - **Subagent catalog** — the authoritative roster of enabled subagents.

</template>
<template #zh>

> 这些内容已经在你的 prompt 中了；不要自己去「读」这些文件。
>
> - **用户提示**来自 `USER_HINTS.md`（在你的阶段成功后会被清理）。
> - **Blueprint-doctor 发现**来自上一轮迭代（孤儿章节、断裂的 `\ref`/`\uses`、新公理）。
> - **最近几轮迭代的 sidecar**（最近几轮的 `plan.md` / `review.md`）、**prover-modes 目录**、**leandag 图状态**和**参考文献摘要**。
> - **子 Agent 目录**——已启用子 Agent 的权威清单。

</template>
</Bilingual>

### 引擎抽象层：可互换的 AI 后端

Archon 里很巧妙的一个设计是 `AgentRunner` 协议——所有 AI 后端都实现同一个接口，换引擎只需改配置：

```python
# agent.py: AgentRunner 协议
@runtime_checkable
class AgentRunner(Protocol):
    """每个调用点都面向这个引擎接口编程。
    ClaudeAgent 是内置实现；CodexAgent 是第一个兄弟引擎。
    调用方通过 build_runner() 获取 runner，而非直接构造 ClaudeAgent，
    所以把某个角色的引擎换成另一个引擎是配置变更，而非每处改代码。
    """

    def run(self, prompt, *, cwd, log_base=None, ...) -> bool:
        """无头 claude -p / codex exec 运行"""
        ...

    def run_interactive(self, prompt, *, cwd, ...) -> int:
        """前台交互式运行"""
        ...
```

系统通过 `build_runner()` 工厂函数做唯一路由决策，解析优先级为 `loop.roles.<role> > loop.harness > "claude-code"`。目前支持三个引擎：

| 引擎 | 说明 |
|------|------|
| **ClaudeAgent** | 默认引擎，调用 `claude -p`。有多种后端绕过 Anthropic 限速 |
| **CodexAgent** | OpenAI Codex CLI 引擎，把 Codex 的 JSON 流实时归一化成 Archon 的 JSONL 格式 |
| **AntigravityAgent** | Google DeepMind Antigravity CLI，逆向工程 SQLite+Protobuf 日志 |

#### 禁止原生子 Agent 工具

<mark>Archon 的编排模型有一个关键假设：每个阶段 Agent 是一次性的无头进程，它的 turn 不会结束直到所有工作完成。</mark>如果 Agent 用原生的 `Agent` 工具后台调度子 Agent，turn 立刻结束，进程退出，编排器以为这轮做完了——但子 Agent 还在飞，会和下一轮的写操作竞争同一个文件。

为了防止这个问题，Archon 禁止了 Claude Code 的原生子 Agent 调度工具：

```python
# agent.py: 禁止的原生工具列表
DISALLOWED_NATIVE_TOOLS: tuple[str, ...] = (
    "Agent",           # 原生子 Agent 调度（spawn-and-return，会立刻结束 turn）
    "Task",            # Task 工具（某些 CLI 版本中 spawner 的名字）
    "ScheduleWakeup",  # 异步唤醒（无阻塞模式）
    # 禁止进程杀死命令：一次 Fable 运行用 pkill -f "lean.*File"
    # 做「清理」，结果匹配到了运行命令的 shell，提前终止了 lane
    "Bash(pkill:*)",
    "Bash(killall:*)",
    "Bash(kill:*)",
)
```

<Bilingual>
<template #en>

> Archon's whole orchestration model assumes each phase agent runs as a one-shot headless `claude -p` whose turn does NOT end until all the work it spawned is done. The native `Agent` (sub-agent spawn) and `ScheduleWakeup` tools break that contract: an agent that backgrounds its dispatches and schedules a wakeup ends its turn immediately. In headless `-p` there is no persistent runtime to honor the wakeup, so the process exits, the orchestrator treats the clean exit as "phase done" and launches the next iteration — while the just-spawned subagents are still in flight, now orphaned and racing the next iteration's writes to the same files.

</template>
<template #zh>

> Archon 的整个编排模型假设每个阶段 Agent 作为一个一次性无头 `claude -p` 运行，它的 turn 在所有它调度的工作完成之前不会结束。原生的 `Agent`（子 Agent 生成）和 `ScheduleWakeup` 工具破坏了这个契约：一个后台调度并安排唤醒的 Agent 会立刻结束它的 turn。在无头 `-p` 模式下没有持久运行时来响应唤醒，所以进程退出，编排器将干净退出视为「阶段完成」并启动下一轮迭代——而刚刚生成的子 Agent 还在运行，变成了孤儿，与下一轮迭代对同一文件的写操作产生竞争。

</template>
</Bilingual>

唯一合法的子 Agent 调度方式是**阻塞式** Bash 调用 `python3 .claude/tools/archon-subagent.py`。这个调用是同步的（`subprocess.run`），Bash 超时被提高到 30 分钟（`BASH_FOREGROUND_TIMEOUT_MS = 30 * 60 * 1000`），所以调度保持在 turn 内。

### 子 Agent 系统：文件系统信号量 + 描述符驱动

子 Agent 是 Archon 的「专注帮手」。与 Plan/Prover/Review 不同，它们带着全新的上下文运行，只看指令指向的内容。子 Agent 默认关闭，用户在 `config.json` 中选择启用。

#### 文件系统信号量

<mark>子 Agent 是独立的 Python 进程（通过 Bash 调用），不能共享内存里的 `threading.Semaphore`。</mark>所以 Archon 用文件系统的原子 `rename` 操作实现了一个信号量 `SlotPool`，保证不管子 Agent 嵌套多深，总并发 Claude 进程数不超过 `max_parallel`：

```python
# dispatch.py: 文件系统信号量
class SlotPool:
    """基于原子 rename 的 slot 信号量。

    slot 文件空闲时在 slots_dir/slot-NNN，
    被占用时在 slots_dir/.held/slot-NNN。
    获取 = 原子 rename（free → held）
    释放 = 原子 rename（held → free）
    超过 1 小时的占用自动回收（防止崩溃进程饿死）
    """

    def acquire(self, timeout_s=None) -> Path:
        """阻塞直到有 slot 可用；返回被持有的路径。"""
        while True:
            # 每次尝试都回收过期占用，防止崩溃的兄弟进程饿死我们
            self._reap_stale(self.held_dir, self.slots_dir, self.stale_after_s)
            for slot in sorted(self.slots_dir.glob("slot-*")):
                target = self.held_dir / slot.name
                try:
                    slot.rename(target)  # 原子操作：成功则获得 slot
                except OSError:
                    continue  # 另一个进程赢得了这个 slot，试下一个
                target.touch()  # 刷新 mtime，防止回收器提前回收
                return target
            time.sleep(0.5)  # 没有可用 slot，等一下再试
```

#### 描述符驱动

添加子 Agent = 丢一个 `.md` 文件到 `.archon/subagents/`。YAML frontmatter 定义元数据，body 是 prompt。不需要写任何 Python 代码。调度时还会验证子 Agent 的 `write_domain`（可写文件范围）是父 Agent 的子集——如果子 Agent 想写父 Agent 无权写的文件，在 Agent 启动前就被拒绝。

Archon 内置了几个关键的子 Agent：

| 子 Agent | 类型 | 阶段 | 功能 |
|----------|------|------|------|
| `strategy-critic` | 只读批评者 | plan | 全新上下文对抗性审查策略，检测沉没成本谬误 |
| `blueprint-reviewer` | 只读批评者 | plan | 全蓝图审计，带 HARD GATE：章节不完整则阻止 prover |
| `lean-auditor` | 只读批评者 | review | 全项目 Lean 审计，逐文件检查清单 |
| `effort-breaker` | 写手 | plan | 把高难度定理拆成 `\uses` 链接的子引理 |
| `strategy-auditor` | 只读批评者 | plan | 对比 STRATEGY.md 和实际参考 PDF，防止幻觉路线 |

`blueprint-reviewer` 的 HARD GATE 是保护项目质量的关键机制：

<Bilingual>
<template #en>

> For each `.lean` file F you are considering adding to `## Current Objectives` (i.e. about to send a prover to), identify the corresponding blueprint chapter C. [...] If C's latest audit verdict is NOT `complete + correct`, **drop F from this iteration's objectives** and dispatch a blueprint-writing subagent instead.

</template>
<template #zh>

> 对于你正在考虑加入 `## Current Objectives` 的每个 `.lean` 文件 F（即准备派 prover 去做的），找到对应的蓝图章节 C。[...] 如果 C 的最新审计结论不是 `complete + correct`（完整且正确），**将 F 从本轮迭代的目标中移除**，改为派一个蓝图编写子 Agent。

</template>
</Bilingual>

### Prover 的内层 Cycle Engine

当 Prover Agent 在证一个文件时，它运行的不是一个简单的「读 sorry → 写证明」流程，而是一个六阶段循环引擎：

<Bilingual>
<template #en>

> Both commands share a six-phase cycle engine:
>
> `Plan → Work → Checkpoint → Review → Replan → Continue/Stop`
>
> 1. **Plan** — Discover state via LSP, identify sorries, set order
> 2. **Work** — Fill sorries using search + tactics
> 3. **Checkpoint** — Stage and commit progress
> 4. **Review** — Quality check at configured intervals
> 5. **Replan** — Enter planner mode, produce/update action plan
> 6. **Continue/Stop** — prove: prompt user; autoprove: auto-continue or stop

</template>
<template #zh>

> 两个命令共享一个六阶段循环引擎：
>
> `Plan → Work → Checkpoint → Review → Replan → Continue/Stop`
>
> 1. **Plan（规划）**—— 通过 LSP 发现状态，识别 sorry，设定顺序
> 2. **Work（工作）**—— 使用搜索 + 战术填充 sorry
> 3. **Checkpoint（检查点）**—— 暂存并提交进度
> 4. **Review（审查）**—— 在配置间隔时进行质量检查
> 5. **Replan（重新规划）**—— 进入规划模式，生成/更新行动计划
> 6. **Continue/Stop（继续/停止）**—— prove：提示用户；autoprove：自动继续或停止

</template>
</Bilingual>

<mark>Cycle Engine 遵循 LSP-first 协议：LSP 工具是第一选择，脚本只是后备。</mark>三级验证阶梯确保在正确的层级做验证：

| 层级 | 工具 | 时机 | 速度 |
|------|------|------|------|
| 每次编辑后 | `lean_diagnostic_messages(file)` | 每次编辑 | 亚秒级 |
| 文件编译 | `lake env lean <path/to/File.lean>` | 文件级门控 | 秒级 |
| 项目编译 | `lake build` | 检查点、最终门控 | 分钟级 |

当同一个 blocker 出现两次时，触发**Stuck Detection**——强制 review + replan，可能进入 Deep Mode（有界多文件重构，带快照/回滚/回归门控）或 Falsification（找反例）。

### Prover Modes：行为层

Plan Agent 给每个目标文件打标签 `[prover-mode: <name>]`，选择最合适的模式。每个模式是一个带 YAML frontmatter 的 `.md` 文件，定义了 prover 的目标、工作流和约束：

| Mode | 用途 | 核心约束 |
|------|------|----------|
| `formalize` | 从蓝图创建 sorry 桩 | 输出必须编译通过，不期望有证明 |
| `prove` | 默认，积极填 sorry | 难度不是留 sorry 的理由 |
| `fine-grained` | 大定理没进展时用 | 更细粒度的分解 |
| `mathlib-build` | 缺 Mathlib 引理时 | **输出中不允许有 sorry**，每步必须完全证明 |
| `golf` | 压缩已编译的证明 | 不做结构性改变 |
| `polish` | golf + 重构 + 提取引理 | 只处理已编译的证明 |

`mathlib-build` 模式体现了 Archon 的 **Mathlib 梯度策略**——不在缺失的 Mathlib 引理上卡住，而是在项目侧 axiom-clean 地建它：

<Bilingual>
<template #en>

> Build project-local Mathlib infrastructure axiom-clean, one step at a time, going **as far as possible** in this iteration. Your output consists of definitions and lemmas that compile without `sorry` and whose `#print axioms` shows only `{propext, Classical.choice, Quot.sound}`. You stop only when you hit a genuine mathematical blocker — not because one step is hard.

</template>
<template #zh>

> 逐步构建项目本地的 Mathlib 基础设施，保持 axiom-clean，在本轮迭代中走得**尽可能远**。你的输出由不含 `sorry` 且 `#print axioms` 只显示 `{propext, Classical.choice, Quot.sound}` 的定义和引理组成。你只在遇到真正的数学阻碍时停止——而不是因为某一步很难。

</template>
</Bilingual>

### 多车道并行证明

自 v0.2.0 起，Archon 支持多车道并行证明——多个 LLM 提供商（Anthropic、Kimi、DeepSeek）并行证明同一个文件：

```
Jobs（每个 .lean 文件一个）
  × Lanes（每个 LLM 提供商一个，独立 git worktree）
  = Assignments（笛卡尔积）

所有 Assignment 并发运行
    ↓
某个 Lane 干净完成 → 其他 Lane 得到 10 分钟宽限期 → 然后被杀
    ↓
Per-file Merge Agent：Claude 读所有候选版本，按声明选最干净的证明
```

<mark>Per-file Merge Agent 用 Claude Agent 而非确定性排序器来选最佳证明。</mark>原因是 prover 不会引入新声明，所以文件结构在 lane 间固定，合并就是「每个引理选最干净的实现」——判断「最干净」需要和写证明同样的判断力：

```python
# multilane/merge_agent.py 的模块文档字符串
"""Per-file merge agent for multi-lane prover outputs.

When more than one lane finishes a file cleanly (no `sorry`, no new
axioms, builds), the merger picks the best proof per declaration and
writes a single merged file back to the main project tree.

Why a Claude agent instead of a deterministic ranker:
  Provers don't introduce new declarations — the file structure is
  fixed across lanes. Each lane only fills in proofs of declarations
  that already existed. So merging is "for each lemma, pick the
  cleanest implementation" — and judging "cleanest" needs the same
  judgment that wrote the proofs in the first place. A Claude agent
  with the lane outputs side-by-side does this naturally.

When only ONE lane succeeded for a file, the merger is bypassed and
the lane's output is copied verbatim. That preserves the
"first-clean-wins" semantics for the single-lane case.
"""
```

### 自治但不等待

<mark>Archon 被设计为完全自主运行——循环永远不为人类暂停。</mark>每个决策都被做出来并提交，用户通过 `USER_HINTS.md` 异步引导（下一轮迭代才生效）。`TO_USER.md` 是一个持久的通知板，不是问题队列：

<Bilingual>
<template #en>

> The loop is autonomous and may run unattended for many iters — no human reads a question in time. So **every strategy-level choice is yours**: pick the best option on the evidence, commit, and dispatch provers on it THIS iter. The user steers only by adding to `USER_HINTS.md`, which the *next* iter honours — an async override, never a gate you wait on.
>
> What you must NEVER produce: a "no prover dispatch this iter — awaiting decision" round, an options menu with a "where to reply", or a "default to X if no reply" framing.

</template>
<template #zh>

> 循环是自主的，可能无人值守地运行很多轮迭代——没有人能及时读到一个问题。所以**每个策略层面的选择都是你的**：根据证据选择最佳选项，做出承诺，并在本轮迭代就派 prover 去做。用户只通过向 `USER_HINTS.md` 添加内容来引导，而那是*下一轮*迭代才会遵守的——一个异步覆盖，永远不是你等待的闸门。
>
> 你绝对不能产出的东西：一轮「本轮不派 prover——等待决策」，一个带「在哪里回复」的选项菜单，或者一个「如果没回复则默认 X」的框架。

</template>
</Bilingual>

### 反内卷：收敛批评者

一个 mandatory 的收敛批评者会返回三种判决之一：CONVERGING（收敛中）、CHURNING（空转中）、STUCK（卡住了）。CHURNING/STUCK 的判决**迫使**本轮做出具体纠正——不能只是换个措辞重新调度同一个文件：

<Bilingual>
<template #en>

> A CHURNING/STUCK verdict **obliges a concrete corrective THIS iter** — do at least one of: dispatch the named unblocking subagent, rewrite the blueprint chapter, or pivot the route in STRATEGY.md. Re-dispatching the same file with a reworded recipe is exactly the non-response the critic exists to catch.

</template>
<template #zh>

> 一个 CHURNING/STUCK 判决**迫使本轮做出具体纠正**——至少做以下之一：派发指定的解锁子 Agent、重写蓝图章节、或在 STRATEGY.md 中切换路线。用换了个措辞的配方重新调度同一个文件，正是批评者存在要捕捉的那种无效行为。

</template>
</Bilingual>

### 先证伪再花钱

<mark>在给难的 sorry 投入预算之前，Plan Agent 会先在小模型上尝试找反例。</mark>假命题永远烧不完迭代，所以先花一个便宜的 pass 试图证伪它：

<Bilingual>
<template #en>

> Before committing more than one iter of prover budget to a hard or recurring `sorry`, spend a cheap pass trying to **DISPROVE** it:
> - Instantiate on the smallest non-trivial models — finite, degenerate, boundary: does any satisfy the hypotheses but violate the conclusion?
> - If you can't see it yourself, dispatch the informal / mathlib-analogist subagent asking specifically for a **counterexample or satisfiability sketch**, not a proof.
>
> If a counterexample turns up, the statement (or a missing hypothesis) is the bug: fix the blueprint statement, mark the Lean decl `% NOTE:` for review, and do NOT formalize the false version.

</template>
<template #zh>

> 在给一个难的或反复出现的 `sorry` 投入超过一轮迭代的 prover 预算之前，花一个便宜的 pass 试图**证伪**它：
> - 在最小的非平凡模型上实例化——有限的、退化的、边界的：是否有任何模型满足假设但违反结论？
> - 如果你自己看不出来，派非正式/mathlib-analogist 子 Agent，专门要求一个**反例或可满足性草图**，而不是证明。
>
> 如果反例出现了，那么陈述（或缺失的假设）就是 bug：修复蓝图陈述，将 Lean 声明标记 `% NOTE:` 等待审查，不要形式化错误版本。

</template>
</Bilingual>

### LeanDAG：确定性的依赖图

LLM 倾向于在内部表示中过度简化依赖关系。Archon 用 [LeanDAG](https://github.com/AxelDlv00/LeanDAG)——一个独立的 API——来查询 Lean 项目的 DAG 结构，使编排器、Plan Agent 和 Dashboard 都看到同一张图。它还估算每个组件的难度：从非正式证明的字符数估算工作量，递归累加尚未证明的依赖项的工作量。这个估计很粗糙，但只用于排序证明队列和决定何时拆分高工作量定理。

Plan Agent 的 prompt 中会注入当前的 DAG 前沿（哪些定理可以开始证了）和 ∞-effort 洞（哪些定理还没有非正式证明草稿）：

<Bilingual>
<template #en>

> **Ready to prove** — every `\uses{}` dep is done. Dispatch the frontier first.
> **∞ effort / ∞ sources** — a statement with NO informal proof. Formalizing it is blind progress: **never dispatch a prover at an ∞-effort node.** Write the missing informal proof first.
> **Broken `\uses{}`** — fix the ref before dispatching anything that depends on it.

</template>
<template #zh>

> **可以开始证明**——每个 `\uses{}` 依赖都已完成。先派发前沿节点。
> **∞ 工作量 / ∞ 源**——一个没有非正式证明的陈述。形式化它是盲目的推进：**永远不要在 ∞-effort 节点上派发 prover。** 先写出缺失的非正式证明。
> **断裂的 `\uses{}`**——在派发任何依赖它的东西之前，先修复引用。

</template>
</Bilingual>

### Inner Git：私有版本控制

Archon 有一个私有 git 仓库在 `.archon/git-dir/`，共享项目工作树但使用独立的 `GIT_DIR`。每个阶段提交为 `archon[NNN/phase]: …`，所以 Dashboard 的 git 树显示的是每阶段历史，独立于项目的外部 git。`archon branch` 可以从任何历史 Agent 提交 fork 出一个分支——如果某轮迭代跑偏了，可以回退。因为这段历史在 `.archon/git-dir/` 中，用户自己的 `.git` 永远不被 Archon 碰。

### 设计原则分析

总结下来，Archon 有几个核心设计原则：

**1. 意图与执行分离。** Plan Agent 想数学，Prover Agent 写 Lean。这种分离防止了上下文爆炸，让每个 Agent 只管自己那一摊。Plan Agent 的输出是「数学意图」（蓝图 `.tex` + `PROGRESS.md`），Prover Agent 的输出是 Lean 语法——两者绝不交叉。

**2. 蓝图优先。** 非正式 `.tex` 章节（带逐字引用）在 Lean 代码之前写。`blueprint-reviewer` 的 HARD GATE 阻止 prover 碰章节不完整的文件。Archon 的规则是「有 Lean 的地方就有 tex」——prover 创建的每个 helper 都必须有蓝图条目，否则它就是一个图看不到的孤立节点。

**3. 全新上下文的批评者。** `strategy-critic` 和 `lean-auditor` 故意看不到项目历史，所以能发现沉没成本谬误和基础设施拖延——这是 invested planner 会漏掉的。它们的价值恰恰来自于*不*携带项目的逐轮历史。

**4. 确定性脚手架包围 LLM 非确定性。** `sync_leanok` 确定性地同步标记，`blueprint-doctor` 确定性地检测结构问题，`plan_validate` 确定性地解析目标，LeanDAG 确定性地计算依赖图。这些确定性组件在 Agent 之间自动运行，LLM 只管真正需要判断的部分。

**5. 自治但不等待。** 循环永远不为人类暂停。每个决策都做出来并提交，用户通过 `USER_HINTS.md` 异步引导。Archon 可以无人值守地跑很多轮迭代。

**6. 多 LLM 提供商竞争。** 多车道并行让不同 LLM 提供商同时证明同一个文件，先完成的赢，Merge Agent 按声明选最佳证明。算力够的话能大幅加速。

**7. 先证伪再花钱。** 给难的 sorry 投预算前，先在小模型上找反例。假命题永远烧不完迭代，一个便宜的证伪 pass 可以省掉大量浪费。

**8. 文件系统是 IPC 总线。** 子 Agent 是独立 Python 进程，靠文件系统信号量协调并发；多车道用隔离 git worktree；inner-git 共享工作树但独立 `GIT_DIR`。跨进程协调不需要复杂的 IPC 机制。

