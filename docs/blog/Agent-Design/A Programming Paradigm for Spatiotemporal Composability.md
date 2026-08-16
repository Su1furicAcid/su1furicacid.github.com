---
title: A Programming Paradigm for Spatiotemporal Composability
date: 2026-08-15
summary: 论文 "A Programming Paradigm for Spatiotemporal Composability" 的中英双语对照翻译，提出了一种面向时空可组合性的编程范式，通过将经典效应与协效应概念提升为运行时机制，实现动态组合的形式化基础。
tags:
  - Agent-Design
---

# A Programming Paradigm for Spatiotemporal Composability

> 作者：Yifan Shi, Wei Zhang, Tianyi Cui · 北京大学 / DeepSeek-AI

<!-- Bilingual content begins below -->

<Bilingual>
<template #en>

Modern software—from plugin systems to self-evolving agent harnesses—increasingly requires dynamic composition, yet its formal foundations remain underdeveloped. We identify two orthogonal dimensions of the problem: temporal composability, the ability to completely revert a component's side effects upon removal, and spatial composability, the ability to declare and reactively manage inter-component dependencies. We address the two dimensions by lifting classical effect and coeffect concepts to runtime mechanisms. In particular, we formalize revertible effects, in which every context transformation carries an inverse that the runtime tracks. We formalize reactive coeffects, in which each change of the context notifies a component against its coeffect specification. We unify the effect context and the coeffect context into a single context type, which constitutes a programming paradigm. After that, we combine these mechanisms into the notion of a component and give a calculus of dynamic composition, whose metatheory carries spatiotemporal composability from a single component to a whole system of interleaved components. We implement these ideas in Cordis, a meta-framework of spatiotemporal composability that provides a core library with effect tracking and coeffect resolution, as well as a declarative component loader with configuration reconciliation and hot module replacement.

</template>
<template #zh>

现代软件——从插件系统到自演化的智能体框架——日益需要动态组合，然而其形式化基础仍然不够成熟。我们识别了该问题的两个正交维度：时间可组合性（temporal composability），即在移除组件时完全撤销其副作用的能力；以及空间可组合性（spatial composability），即声明并响应式管理组件间依赖的能力。我们通过将经典的效应（effect）与协效应（coeffect）概念提升为运行时机制来解决这两个维度。具体而言，我们将可逆效应（revertible effects）形式化，其中每个上下文变换都携带一个由运行时跟踪的逆变换。我们将响应式协效应（reactive coeffects）形式化，其中上下文的每次变更都会根据组件的协效应规格通知该组件。我们将效应上下文与协效应上下文统一为单一的上下文类型，这构成了一种编程范式。随后，我们将这些机制组合为组件的概念，并给出动态组合的演算系统，其元理论将时空可组合性从单一组件推广到由交错组件构成的整个系统。我们在 Cordis 中实现了这些思想——Cordis 是一个时空可组合性的元框架，提供了一个具备效应跟踪与协效应解析的核心库，以及一个具备配置调和与热模块替换的声明式组件加载器。

</template>
</Bilingual>

## 1. Introduction

<Bilingual>
<template #en>

Composition—assembling complex systems from simpler parts—is a foundational principle of software engineering [1]. Traditionally, composition is static: function calls, module imports, and class inheritance are resolved at compile time and remain fixed throughout execution. However, modern software increasingly demands dynamic composition, where components are loaded, unloaded, and reconfigured at runtime. Plugin architectures [2] and self-evolving agent harnesses both require systems that can safely add and remove functionality on the fly, yet current practice defers to coarse-grained mechanisms [3] that reconfigure only by restarting, discarding runtime state. Despite the growing practical importance of dynamic composition, its theoretical foundations remain underdeveloped, compared to the rich formal frameworks available for static composition.

</template>
<template #zh>

组合——从更简单的部分组装复杂系统——是软件工程的一项基本原则 [1]。传统上，组合是静态的：函数调用、模块导入和类继承在编译时解析，并在整个执行过程中保持固定。然而，现代软件日益需要动态组合，即组件在运行时被加载、卸载和重新配置。插件架构 [2] 和自演化的智能体框架都要求系统能够即时安全地添加和移除功能，但当前实践依赖于粗粒度机制 [3]，这些机制只能通过重启来重新配置，并丢弃运行时状态。尽管动态组合的实际重要性日益增长，但与静态组合所拥有的丰富形式化框架相比，其理论基础仍然不够成熟。

</template>
</Bilingual>

### 1.1. Dimensions of Composability

<Bilingual>
<template #en>

To characterize the requirements of dynamic composition, we identify two orthogonal dimensions beyond the well-studied algebraic aspects of composition:

</template>
<template #zh>

为了刻画动态组合的需求，我们在组合的广受研究的代数层面之外，识别了两个正交维度：

</template>
</Bilingual>

<Bilingual>
<template #en>

- **Temporal composability** addresses the time dimension: upon removal of a component, the modifications the component made to the shared environment must be completely and safely reversed. This requires tracking every resource allocation, event registration, and state mutation the component performs, and guaranteeing their orderly reclamation upon removal.

</template>
<template #zh>

- **时间可组合性**关注时间维度：在移除组件时，组件对共享环境所做的修改必须被完全且安全地撤销。这要求跟踪组件执行的每一项资源分配、事件注册和状态变更，并保证在移除时有序地回收它们。

</template>
</Bilingual>

<Bilingual>
<template #en>

- **Spatial composability** addresses the space dimension: components must be able to declare, discover, and resolve their dependencies on one another in a structured and verifiable manner. This requires managing dependency topology and coordinating component lifecycles in response to dependency changes.

</template>
<template #zh>

- **空间可组合性**关注空间维度：组件必须能够以结构化且可验证的方式声明、发现和解析彼此之间的依赖关系。这要求管理依赖拓扑，并响应依赖变化来协调组件生命周期。

</template>
</Bilingual>

<Bilingual>
<template #en>

In the static setting, temporal composability reduces to lexical scoping (e.g., RAII [4], bracket patterns [5]), and spatial composability reduces to module import resolution [6]. In the dynamic setting, where components arrive and depart at runtime, both dimensions become significantly harder: temporal composability must handle long-lived, stateful effects whose scope is not lexically bounded; and spatial composability must handle dependencies that appear, disappear, or change identity during execution.

</template>
<template #zh>

在静态环境中，时间可组合性归约为词法作用域（例如 RAII [4]、bracket 模式 [5]），空间可组合性归约为模块导入解析 [6]。在动态环境中，组件在运行时到来和离去，两个维度都变得显著更难：时间可组合性必须处理作用域不受词法约束的长期有状态效应；空间可组合性必须处理在执行过程中出现、消失或改变标识的依赖关系。

</template>
</Bilingual>

### 1.2. Motivating Examples

#### 1.2.1. Plugin Systems

<Bilingual>
<template #en>

Plugin systems are a canonical instance of dynamic composition. We use Visual Studio Code (VSCode), one of the most widely-used extensible IDEs, as a representative example.

</template>
<template #zh>

插件系统是动态组合的典型实例。我们以 Visual Studio Code（VSCode）——最广泛使用的可扩展 IDE 之一——作为代表性例子。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Temporal limitation.** VSCode runs all extensions in a shared process called the extension host. Although extensions can be installed dynamically, this host provides no mechanism to unload an individual extension's code at runtime. Once an extension's `activate` function has executed, disabling or uninstalling it requires restarting the entire host, affecting all loaded extensions. Purely declarative extensions such as themes, keybindings, and snippets carry no code and can be removed freely. Among the top 100 extensions by install count, however, 87 contain executable code and will therefore require such a restart upon removal. Although VSCode provides a `deactivate` hook, it serves only as a graceful shutdown callback during the host process' termination, and thus does not enable live removal. Moreover, the hook separates effect disposal from effect creation (in `activate`), violating locality of concern and making complete cleanup difficult to verify.

</template>
<template #zh>

**时间维度的局限。** VSCode 在一个称为扩展宿主（extension host）的共享进程中运行所有扩展。虽然扩展可以动态安装，但该宿主没有提供在运行时卸载单个扩展代码的机制。一旦扩展的 `activate` 函数执行完毕，禁用或卸载它就需要重启整个宿主，影响所有已加载的扩展。纯粹声明式的扩展（如主题、快捷键和代码片段）不携带代码，可以自由移除。然而，在按安装量排名前 100 的扩展中，有 87 个包含可执行代码，因此在移除时需要这样的重启。虽然 VSCode 提供了 `deactivate` 钩子，但它仅作为宿主进程终止期间的优雅关闭回调，因此无法实现实时移除。此外，该钩子将效应的处置与效应的创建（在 `activate` 中）分离，违反了关注点局部性，使得完全清理难以验证。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Spatial limitation.** VSCode does provide `extensionDependencies` for declaring dependencies between extensions, but it sees little use: among the top 100 extensions by install count, only 7 declare `extensionDependencies` on non-built-in extensions. This scarcity reflects the shape of the extension API, which exposes fixed, surface-level extension points such as commands, views, and language features. Extensions contribute to the host through these points rather than depending on one another, so inter-extension dependencies rarely arise. Moreover, VSCode's mechanism for inter-extension interaction provides no structural contract: it exposes an extension's functionality to others through `vscode.extensions.getExtension(...).exports`, but the returned value is untyped (`any` by default), so the dependent cannot rely on a checked interface. In short, VSCode steers extensions toward a fixed set of host-provided extension points, and offers no safe, structured way for them to depend on one another.

</template>
<template #zh>

**空间维度的局限。** VSCode 确实提供了 `extensionDependencies` 来声明扩展之间的依赖关系，但使用很少：在按安装量排名前 100 的扩展中，只有 7 个声明了对非内置扩展的 `extensionDependencies`。这种稀缺性反映了扩展 API 的形态，它暴露了固定的、表层级的扩展点，如命令、视图和语言特性。扩展通过这些点向宿主贡献功能，而不是相互依赖，因此扩展间的依赖很少出现。此外，VSCode 的扩展间交互机制没有提供结构性契约：它通过 `vscode.extensions.getExtension(...).exports` 向其他扩展暴露功能，但返回值是无类型的（默认为 `any`），因此依赖方无法依赖一个经过检查的接口。简言之，VSCode 将扩展引导到一组固定的宿主提供的扩展点，而没有为它们提供安全、结构化的相互依赖方式。

</template>
</Bilingual>

<Bilingual>
<template #en>

These two limitations are not unique to VSCode; they recur across plugin systems generally [2, 7], differing only in degree.

</template>
<template #zh>

这两个局限并非 VSCode 独有；它们在插件系统中普遍存在 [2, 7]，只是程度不同。

</template>
</Bilingual>

#### 1.2.2. Self-Evolving Agent Harnesses

<Bilingual>
<template #en>

Modern AI agents rely on runtime agent harnesses [8–10]. These systems may compose diverse tool suites [11] and execution environments, govern permissions and sandboxing, maintain session state and persistence, provide context management and memory systems [12], orchestrate subagents and multi-agent workflows [13], and expose interfaces to users and automation. A future harness may generate and deploy modifications to its own components while continuously serving requests. Model-synthesized reusable tools provide a narrower precursor to component-level self-modification [14]. Each such modification is itself an instance of dynamic composition.

</template>
<template #zh>

现代 AI 智能体依赖于运行时智能体框架 [8–10]。这些系统可能组合多样化的工具套件 [11] 和执行环境，管理权限和沙箱，维护会话状态和持久化，提供上下文管理和记忆系统 [12]，编排子智能体和多智能体工作流 [13]，并向用户和自动化暴露接口。未来的框架可能会在持续服务请求的同时，生成并部署对自身组件的修改。模型合成的可复用工具为组件级自我修改提供了一个更窄的前身 [14]。每一次这样的修改本身就是动态组合的一个实例。

</template>
</Bilingual>

<Bilingual>
<template #en>

Because these modifications occur continuously and with limited or no human oversight, dynamic composability becomes indispensable. Without temporal composability, each self-modification forces a full restart that discards all process-local accumulated state; at such frequency the cumulative unavailability becomes substantial, and in-flight tasks are disrupted repeatedly; even worse, a faulty self-modification can disable the very process needed to recover. Without spatial composability, each module must itself detect and adapt to changes in the modules it depends on as they appear, disappear, or change identity, and can do so only by ad hoc means; even worse, a naive code-replacement strategy may silently break dependents or introduce circular dependencies that surface only at reload time.

</template>
<template #zh>

由于这些修改持续发生且人工监督有限或没有，动态组合性变得不可或缺。没有时间可组合性，每次自我修改都会强制完全重启，丢弃所有进程本地积累的状态；在这种频率下，累积的不可用时间变得相当可观，正在进行的任务被反复中断；更糟糕的是，一个有缺陷的自我修改可能禁用恢复所需的那 个进程本身。没有空间可组合性，每个模块必须自行检测并适应其依赖模块在出现、消失或改变标识时的变化，且只能通过临时手段做到；更糟糕的是，一个简单的代码替换策略可能默默地破坏依赖方，或引入仅在重载时才暴露的循环依赖。

</template>
</Bilingual>

#### 1.2.3. The Coarse-Grained Workaround

<Bilingual>
<template #en>

One reason dynamic composability has received limited formal attention is that operating systems and container orchestrators already provide a coarse-grained substitute. Operating systems yield temporal composability at the granularity of a process; container orchestrators [3] yield spatial composability at the granularity of a service. In practice, most software tolerates the lack of fine-grained composability by deferring to these coarse-grained mechanisms: a misbehaving module is handled by restarting the process, and a service dependency is managed by the container orchestrator.

</template>
<template #zh>

动态组合性之所以受到有限的形式化关注，一个原因是操作系统和容器编排器已经提供了粗粒度的替代方案。操作系统在进程粒度上提供时间可组合性；容器编排器 [3] 在服务粒度上提供空间可组合性。在实践中，大多数软件通过依赖这些粗粒度机制来容忍细粒度可组合性的缺失：行为异常的模块通过重启进程来处理，服务依赖由容器编排器管理。

</template>
</Bilingual>

<Bilingual>
<template #en>

However, this workaround imposes substantial costs. Temporally, each restart discards all process-local accumulated state (e.g., caches, connections, partial computations), and rebuilding it takes seconds to minutes [15]; maintaining availability in the interim requires redundant replicas, incurring resource overhead to compensate for the inability to recover a single component. Spatially, container-level orchestration cannot express dependencies between components sharing an address space, and introduces network overhead for interactions that could be local function calls. Both mechanisms operate at the boundary of processes and containers, yet modern systems increasingly compose at a finer level. This granularity mismatch demands a compositional abstraction that manages effects and dependencies at the same level as the components themselves.

</template>
<template #zh>

然而，这种权宜之计带来了巨大的代价。在时间上，每次重启都会丢弃所有进程本地积累的状态（如缓存、连接、部分计算结果），重建这些状态需要数秒到数分钟 [15]；在此期间维持可用性需要冗余副本，为了补偿无法恢复单个组件而产生资源开销。在空间上，容器级编排无法表达共享地址空间的组件之间的依赖关系，并为本可以是本地函数调用的交互引入了网络开销。两种机制都在进程和容器的边界上运作，而现代系统越来越多地在更细的层面上进行组合。这种粒度不匹配要求一种组合抽象，能够在与组件本身相同的层面上管理效应和依赖。

</template>
</Bilingual>

### 1.3. Contributions

<Bilingual>
<template #en>

The two dimensions of dynamic composability concern, respectively, how computations modify and how they depend on their environment. These two directions are what effect systems [16, 17] and coeffect systems [18, 19] formalize: effects provide the formal vocabulary for reasoning about environmental modifications, and coeffects for reasoning about environmental requirements. However, existing formulations restrict reasoning to compile-time analysis over lexically fixed scopes, and do not extend to dynamic scenarios where components arrive and depart at runtime. By lifting effects to a revertible runtime model and coeffects to a reactive dependency resolution mechanism, we obtain a unified formal foundation for dynamic composability, one that is language-agnostic and applicable to any software architecture requiring dynamic composition. We make the following contributions:

</template>
<template #zh>

动态组合性的两个维度分别关注计算如何修改其环境以及如何依赖其环境。这两个方向正是效应系统 [16, 17] 和协效应系统 [18, 19] 所形式化的内容：效应为推理环境修改提供了形式化词汇，协效应为推理环境需求提供了形式化词汇。然而，现有的形式化将推理限制在词法固定作用域上的编译时分析，无法扩展到组件在运行时到来和离去的动态场景。通过将效应提升为可逆的运行时模型，将协效应提升为响应式依赖解析机制，我们获得了动态组合性的统一形式化基础——它是语言无关的，适用于任何需要动态组合的软件架构。我们做出以下贡献：

</template>
</Bilingual>

<Bilingual>
<template #en>

1. We formalize **revertible effects** (Section 3.1): every context transformation carries an explicit inverse that the runtime tracks, and both tracking and recovery preserve composition, so the context is recovered upon component removal. This establishes local temporal composability.

</template>
<template #zh>

1. 我们将**可逆效应**形式化（第 3.1 节）：每个上下文变换都携带一个由运行时跟踪的显式逆变换，跟踪和恢复都保持组合性，因此在组件移除时上下文得以恢复。这建立了局部时间可组合性。

</template>
</Bilingual>

<Bilingual>
<template #en>

2. We formalize **reactive coeffects** (Section 3.2): a component declares the coeffects it requires as a specification, and each change of the context notifies the component against that specification as activating, deactivating, or neutral. This establishes local spatial composability.

</template>
<template #zh>

2. 我们将**响应式协效应**形式化（第 3.2 节）：组件将其所需的协效应声明为规格，上下文的每次变更都根据该规格通知组件，分类为激活、去激活或中性。这建立了局部空间可组合性。

</template>
</Bilingual>

<Bilingual>
<template #en>

3. We unify the effect context and the coeffect context into a single context type (Section 3.3), in which an observational equivalence on the coeffects supplies the effects with independence, constituting a programming paradigm for spatiotemporal composability.

</template>
<template #zh>

3. 我们将效应上下文与协效应上下文统一为单一的上下文类型（第 3.3 节），其中协效应上的观察等价性为效应提供了独立性，构成了一种时空可组合性的编程范式。

</template>
</Bilingual>

<Bilingual>
<template #en>

4. We give a **calculus of dynamic composition** (Section 4), which combines the two mechanisms into the notion of a component and equips its lifecycle with an operational semantics. Its metatheory carries spatiotemporal composability from a single component to a whole system of interleaved components.

</template>
<template #zh>

4. 我们给出了**动态组合演算**（第 4 节），将两种机制组合为组件的概念，并为其生命周期配备了操作语义。其元理论将时空可组合性从单一组件推广到由交错组件构成的整个系统。

</template>
</Bilingual>

<Bilingual>
<template #en>

5. We implement these ideas in **Cordis** (Section 5), a meta-framework of spatiotemporal composability that provides a core library realizing the formal model with effect tracking and coeffect resolution, as well as a declarative component loader with configuration reconciliation and hot module replacement.

</template>
<template #zh>

5. 我们在 **Cordis** 中实现了这些思想（第 5 节）——Cordis 是一个时空可组合性的元框架，提供了一个以效应跟踪和协效应解析实现形式化模型的核心库，以及一个具备配置调和与热模块替换的声明式组件加载器。

</template>
</Bilingual>

## 2. Preliminaries

<Bilingual>
<template #en>

This section provides a concise overview of effect and coeffect systems—the two theoretical pillars underlying our work. We assume familiarity with basic type theory and category theory; the goal here is to fix notation and introduce the key abstractions that Section 3 will operationalize as runtime mechanisms.

</template>
<template #zh>

本节简要概述效应系统和协效应系统——我们工作背后的两大理论支柱。我们假设读者对基本类型论和范畴论较为熟悉；这里的目标是确定记号，并引入第 3 节将作为运行时机制加以操作化的关键抽象。

</template>
</Bilingual>

### 2.1. Effects

<Bilingual>
<template #en>

In the simply typed lambda calculus (STLC) [20, 21], a typing judgment $\Gamma \vdash t : T$ states that term $t$ has type $T$ under context $\Gamma$. An effect system refines the type to describe what side effects a computation may produce, yielding judgments of the form

$$
\Gamma \vdash t: T _ {\mathrm{effect}}\tag{1}
$$

Here, the result type is annotated with an element of an effect algebra that describes which side effects the computation may produce, enabling compositional reasoning about stateful computations. This approach originates with Lucassen and Giford [22], who introduced a kinded type system distinguishing types, effects, and regions to discover scheduling constraints in parallel programs.

</template>
<template #zh>

在简单类型 lambda 演算（STLC）[20, 21] 中，类型判断 $\Gamma \vdash t : T$ 表述了项 $t$ 在上下文 $\Gamma$ 下具有类型 $T$。效应系统对类型进行精化，以描述计算可能产生哪些副作用，得到如下形式的判断：

$$
\Gamma \vdash t: T _ {\mathrm{effect}}\tag{1}
$$

这里，结果类型用一个效应代数的元素标注，该元素描述了计算可能产生哪些副作用，从而支持对有状态计算的组合式推理。这一方法起源于 Lucassen 和 Giford [22]，他们引入了一种区分类型、效应和区域的有类类型系统，以发现并行程序中的调度约束。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Monadic effects.** Moggi [16] first modeled computational effects categorically via monads; Wadler [23] popularized the approach in Haskell. A monad $(T, \eta, \mu)$ on a category encapsulates an effectful computation as a value of type $T(A)$, with $\eta: A \to T(A)$ lifting pure values and $\mu: T(T(A)) \to T(A)$ sequencing nested computations. Classic instances include the Maybe monad (for partiality), State monad (for mutable state), and IO monad (for external interaction).

</template>
<template #zh>

**单子效应。** Moggi [16] 首次通过单子范畴论地建模计算效应；Wadler [23] 在 Haskell 中推广了这一方法。范畴上的单子 $(T, \eta, \mu)$ 将效应计算封装为 $T(A)$ 类型的值，其中 $\eta: A \to T(A)$ 提升纯值，$\mu: T(T(A)) \to T(A)$ 序列化嵌套计算。经典实例包括 Maybe 单子（用于部分性）、State 单子（用于可变状态）和 IO 单子（用于外部交互）。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Algebraic effects.** Plotkin and Power [17, 24] showed that algebraic operations determine monads, establishing a framework in which effect interfaces are decoupled from their implementations. An effect signature $\Sigma$ declares a set of operations (e.g., $\text{get}: () \to S$, $\text{put}: S \to ()$ for state); programs invoke operations freely without committing to a particular interpretation. Plotkin and Pretnar [25] subsequently introduced effect handlers, which interpret operations by providing continuation semantics:

$$
\text{handle } e \text{ with } \{\mathrm{op}(v, \kappa) \mapsto \dots\}\tag{2}
$$

The handler receives the operation argument $v$ and the delimited continuation $\kappa$, which it may invoke zero, one, or multiple times, enabling exceptions, coroutines, and non-determinism within a uniform framework [26]. Languages such as Koka [27, 28], Eff [29], and OCaml 5 [30] have adopted algebraic effects with varying design trade-offs.

</template>
<template #zh>

**代数效应。** Plotkin 和 Power [17, 24] 证明了代数操作确定单子，建立了一个将效应接口与实现解耦的框架。效应签名 $\Sigma$ 声明一组操作（例如，对于状态：$\text{get}: () \to S$、$\text{put}: S \to ()$）；程序自由调用操作而不提交到特定解释。Plotkin 和 Pretnar [25] 随后引入了效应处理器，通过提供续延语义来解释操作：

$$
\text{handle } e \text{ with } \{\mathrm{op}(v, \kappa) \mapsto \dots\}\tag{2}
$$

处理器接收操作参数 $v$ 和定界续延 $\kappa$，可以调用它零次、一次或多次，从而在统一框架中实现异常、协程和非确定性 [26]。Koka [27, 28]、Eff [29] 和 OCaml 5 [30] 等语言已采用代数效应，各有不同的设计权衡。

</template>
</Bilingual>

### 2.2. Coeffects

<Bilingual>
<template #en>

Dually to effects, a coeffect system [18, 31] enriches the context rather than the type, yielding judgments of the form

$$
\Gamma_{\mathrm{coeffect}} \vdash t: T\tag{3}
$$

Here, the context is annotated with an element of a coeffect algebra describing what the computation requires from its environment, such as resources to access, permissions to hold, or services to depend on. While effects model a program's impact on the world, coeffects model the world's constraints on the program.

</template>
<template #zh>

与效应对偶地，协效应系统 [18, 31] 丰富的是上下文而非类型，得到如下形式的判断：

$$
\Gamma_{\mathrm{coeffect}} \vdash t: T\tag{3}
$$

这里，上下文用一个协效应代数的元素标注，描述计算从其环境中需要什么，如要访问的资源、要持有的权限或要依赖的服务。效应建模程序对世界的影响，而协效应建模世界对程序的约束。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Comonadic coeffects.** The idea of using comonads to structure context-dependent computation was first developed by Uustalu and Vene [32], who proposed symmetric (semi)monoidal comonads as the dual of Moggi's monadic framework for effects, capturing notions such as dataflow and attribute evaluation. Petricek et al. [18] built on this foundation to propose coeffects as a unified static analysis of context-dependence. A comonad $(D, \varepsilon, \delta)$ captures context-dependent computation: $\varepsilon: D(A) \to A$ extracts the current value from a context, and $\delta: D(A) \to D(D(A))$ duplicates context for nested access. The Environment comonad $D(X) = E \times X$ models dependence on a fixed environment $E$; the Stream comonad $D(X) = \mathbb{N} \to X$ models dependence on temporal data.

</template>
<template #zh>

**余单子协效应。** 使用余单子来组织上下文相关计算的思想最早由 Uustalu 和 Vene [32] 发展，他们提出了对称（半）单子余单子作为 Moggi 效应单子框架的对偶，捕捉了数据流和属性求值等概念。Petricek 等人 [18] 在此基础上提出了协效应作为上下文依赖性的统一静态分析。余单子 $(D, \varepsilon, \delta)$ 捕捉上下文相关计算：$\varepsilon: D(A) \to A$ 从上下文中提取当前值，$\delta: D(A) \to D(D(A))$ 复制上下文以供嵌套访问。Environment 余单子 $D(X) = E \times X$ 建模对固定环境 $E$ 的依赖；Stream 余单子 $D(X) = \mathbb{N} \to X$ 建模对时序数据的依赖。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Graded coeffects.** For finer-grained tracking, graded coeffect systems use a pre-ordered semiring $\pmb{S} = (S, \pmb{\Sigma}, +, \times, 0, 1)$ as the coeffect algebra [33], a discipline later unified with graded effects by Gaboardi et al. [19]. Elements of $S$ annotate each variable binding to quantify its usage: 0 for unused, 1 for linear use, $n$ for bounded use, $\infty$ for unrestricted use. The semiring operations compose coeffects sequentially ($\times$) and in parallel ($+$), enabling precise resource tracking, sensitivity analysis [34], and information-flow control [35, 36] within a unified algebraic framework [37].

</template>
<template #zh>

**分级协效应。** 对于更细粒度的跟踪，分级协效应系统使用预序半环 $\pmb{S} = (S, \pmb{\Sigma}, +, \times, 0, 1)$ 作为协效应代数 [33]，这一方法后来由 Gaboardi 等人 [19] 与分级效应统一。$S$ 的元素标注每个变量绑定以量化其使用：0 表示未使用，1 表示线性使用，$n$ 表示有界使用，$\infty$ 表示无限制使用。半环运算顺序地（$\times$）和并行地（$+$）组合协效应，在统一的代数框架 [37] 中实现精确的资源跟踪、敏感度分析 [34] 和信息流控制 [35, 36]。

</template>
</Bilingual>

### 2.3. Relationship to Dynamic Composability

<Bilingual>
<template #en>

Effect and coeffect systems organize reasoning about computation along two complementary directions: effects describe how a computation modifies its environment, whereas coeffects describe how it depends on its environment. These two directions correspond to the two dimensions of dynamic composability identified in Section 1:

</template>
<template #zh>

效应和协效应系统沿着两个互补方向组织对计算的推理：效应描述计算如何修改其环境，协效应描述计算如何依赖其环境。这两个方向对应于第 1 节中识别的动态组合性的两个维度：

</template>
</Bilingual>

<Bilingual>
<template #en>

- **Temporal composability** demands that a component's modifications to the shared environment be revertible upon unloading. The relevant effects are the stateful ones, which durably transform that environment; undoing such a transformation requires it to admit an inverse.

</template>
<template #zh>

- **时间可组合性**要求组件对共享环境的修改在卸载时可逆。相关的效应是有状态的效应，它们持久地变换该环境；撤销这样的变换要求它允许一个逆变换。

</template>
</Bilingual>

<Bilingual>
<template #en>

- **Spatial composability** demands that inter-component dependencies be declared and managed reactively. Such dependencies are the very thing coeffects capture, and managing them amounts to resolving each against what the environment supplies.

</template>
<template #zh>

- **空间可组合性**要求组件间的依赖被声明和响应式管理。这些依赖正是协效应所捕捉的，管理它们就是根据环境提供的来解析每一个依赖。

</template>
</Bilingual>

<Bilingual>
<template #en>

However, classical effect and coeffect systems are static instruments: effects are tracked within lexically fixed scopes and discharged by compile-time handlers; coeffect annotations are verified against contexts determined before execution. Dynamic composition, by contrast, requires these guarantees to hold for components that arrive and depart at runtime, against contexts that evolve continuously. No fixed lexical scope can delimit a plugin loaded after deployment; no compile-time context can anticipate dependencies that emerge from runtime configuration.

</template>
<template #zh>

然而，经典的效应和协效应系统是静态工具：效应在词法固定作用域内被跟踪，并由编译时处理器释放；协效应标注在执行前确定的上下文中被验证。相比之下，动态组合要求这些保证对于在运行时到来和离去、面对持续演化的上下文的组件成立。没有固定的词法作用域能够界定部署后加载的插件；没有编译时上下文能够预期从运行时配置中涌现的依赖。

</template>
</Bilingual>

<Bilingual>
<template #en>

This motivates a shift in perspective: rather than extending static type systems with more annotations, we reify the conceptual structures of effects and coeffects so that a runtime can operate on them directly, establishing dynamically the guarantees these systems provide statically.

</template>
<template #zh>

这促使了视角的转变：我们不是用更多标注来扩展静态类型系统，而是将效应和协效应的概念结构具体化（reify），使运行时可以直接操作它们，动态地建立这些系统静态提供的保证。

</template>
</Bilingual>

## 3. Revertible Effects and Reactive Coeffects

<Bilingual>
<template #en>

This section lifts the concepts of effects and coeffects introduced in Section 2 to runtime mechanisms, constructing a theory of dynamic composition. The central idea is to turn the typing contexts carrying effects and coeffects into context types, i.e., runtime-operable types that reify the context as a first-class entity. For the effect type, we model it as a context transformation paired with an inverse, achieving local temporal composability. For the coeffect context, we model it as a type carrying dependency information, achieving local spatial composability. An observational equivalence on the coeffects then supplies the effects with independence. The unified context that carries both effects and coeffects constitutes a programming paradigm in its own right.

</template>
<template #zh>

本节将第 2 节中引入的效应和协效应概念提升为运行时机制，构建动态组合的理论。核心思想是将携带效应和协效应的类型上下文转化为上下文类型，即运行时可操作的、将上下文具体化为一等实体的类型。对于效应类型，我们将其建模为上下文变换与逆变换的配对，实现局部时间可组合性。对于协效应上下文，我们将其建模为携带依赖信息的类型，实现局部空间可组合性。协效应上的观察等价性则为效应提供独立性。携带效应和协效应的统一上下文本身就构成了一种编程范式。

</template>
</Bilingual>

### 3.1. Revertible Effects

<Bilingual>
<template #en>

Temporal composability is the ability to load and unload components at runtime such that, upon unloading, the shared environment is recovered to its pre-composition state. This requires that every modification a component makes to the environment be both trackable and recoverable. We therefore model an effect as a function of type $\Gamma \to \Gamma \times (\Gamma \to \Gamma)$: applied to the current context, it yields the modified context together with an explicit inverse. Supplying that inverse is what lets the effect be reverted, and returning it to the runtime is what makes the effect trackable. We call such effects **revertible**: by tracking and composing these inverses during execution, complete environment recovery becomes a structural guarantee.

</template>
<template #zh>

时间可组合性是在运行时加载和卸载组件的能力，使得卸载时共享环境恢复到组合前的状态。这要求组件对环境所做的每一次修改都是可跟踪且可恢复的。因此，我们将效应建模为类型为 $\Gamma \to \Gamma \times (\Gamma \to \Gamma)$ 的函数：应用于当前上下文时，它产生修改后的上下文和一个显式逆变换。提供该逆变换使效应可被撤销，将其返回给运行时使效应可被跟踪。我们称这样的效应为**可逆的**：通过在执行过程中跟踪和组合这些逆变换，完全的环境恢复成为结构性保证。

</template>
</Bilingual>

#### 3.1.1. Effect Context

<Bilingual>
<template #en>

Given any impure function $f_{\mathrm{impure}}: X \to Y$, we transform it into a pure form $f: \Gamma \times X \to \Gamma \times Y$, where $\Gamma$ is the context and all possible side effects can be represented as transformations on $\Gamma$. For any fixed input $x: X$, the induced map $\gamma \mapsto \mathrm{pr}_1(f(\gamma, x))$ captures the side effect of $f$ independently of the return value. Effects on $\Gamma$ therefore live in the monoid of transformations $\Gamma \to \Gamma$ under composition $\circ$, where each monoid axiom has a direct reading as a property of effects:

</template>
<template #zh>

给定任何非纯函数 $f_{\mathrm{impure}}: X \to Y$，我们将其转化为纯形式 $f: \Gamma \times X \to \Gamma \times Y$，其中 $\Gamma$ 是上下文，所有可能的副作用都可以表示为 $\Gamma$ 上的变换。对于任何固定输入 $x: X$，导出的映射 $\gamma \mapsto \mathrm{pr}_1(f(\gamma, x))$ 独立于返回值地捕捉了 $f$ 的副作用。因此 $\Gamma$ 上的效应存在于变换 $\Gamma \to \Gamma$ 在复合 $\circ$ 下构成的单子中，其中每条单子公理都可以直接读作效应的一个性质：

</template>
</Bilingual>

<Bilingual>
<template #en>

- **Closure:** the sequential composition of two effects is again an effect;
- **Associativity:** a composite effect is independent of how it is bracketed;
- **Identity:** $\mathrm{id}_\Gamma$, the identity function on $\Gamma$, acts as the unit of composition.

</template>
<template #zh>

- **封闭性：** 两个效应的顺序组合仍然是效应；
- **结合性：** 复合效应与其括号化方式无关；
- **单位元：** $\Gamma$ 上的恒等函数 $\mathrm{id}_\Gamma$ 作为组合的单位。

</template>
</Bilingual>

<Bilingual>
<template #en>

To model effects that can be undone, we pair each transformation $f$ with another transformation $g$ that undoes $f$, and call $g$ a left inverse of $f$, abbreviated to inverse throughout the paper. Undoing is one-sided: what an inverse is held to is $g \circ f$ and never $f \circ g$. Pairs of transformations carry a multiplication of their own:

</template>
<template #zh>

为了建模可以撤销的效应，我们将每个变换 $f$ 与另一个撤销 $f$ 的变换 $g$ 配对，称 $g$ 为 $f$ 的左逆，全文简称逆。撤销是单侧的：逆所对应的是 $g \circ f$ 而非 $f \circ g$。变换对带有自己的乘法：

</template>
</Bilingual>

<Bilingual>
<template #en>

**Definition 1.** Define the twisted composition of pairs of context transformations by

$$
(f_1, g_1) \circ (f_2, g_2) := (f_1 \circ f_2, g_2 \circ g_1)\tag{4}
$$

As for $\circ$ itself, the left operand acts after the right, and the inverses accumulate in the opposite order. It makes $(\Gamma \to \Gamma) \times (\Gamma \to \Gamma)$ a monoid with unit $(\mathrm{id}_\Gamma, \mathrm{id}_\Gamma)$, the product of the monoid of transformations with its opposite, which we call the twisted composition monoid $\mathfrak{T}_\Gamma$ over $\Gamma$.

</template>
<template #zh>

**定义 1.** 定义上下文变换对的扭转复合为

$$
(f_1, g_1) \circ (f_2, g_2) := (f_1 \circ f_2, g_2 \circ g_1)\tag{4}
$$

与 $\circ$ 本身一样，左操作数在右操作数之后作用，逆以相反顺序累积。这使得 $(\Gamma \to \Gamma) \times (\Gamma \to \Gamma)$ 成为以 $(\mathrm{id}_\Gamma, \mathrm{id}_\Gamma)$ 为单位的单子，即变换单子与其对偶的乘积，我们称之为 $\Gamma$ 上的扭转复合单子 $\mathfrak{T}_\Gamma$。

</template>
</Bilingual>

<Bilingual>
<template #en>

To track effects within the context itself, we introduce the following definition:

**Definition 2.** Given a context $\Gamma$, define its effect context as:

$$
\partial\Gamma := \Gamma \times (\Gamma \to \Gamma)\tag{5}
$$

It can be understood as a pair $(\gamma, \varphi)$, where:
- $\gamma: \Gamma$ is the current context state;
- $\varphi: \Gamma \to \Gamma$ is the accumulator, the composite of the inverses of the effects performed so far, and the function that recovers the context to its initial state.

In particular, the initial effect context can be represented as $(\gamma_0, \mathrm{id}_\Gamma)$.

</template>
<template #zh>

为了在上下文自身中跟踪效应，我们引入以下定义：

**定义 2.** 给定上下文 $\Gamma$，定义其效应上下文为：

$$
\partial\Gamma := \Gamma \times (\Gamma \to \Gamma)\tag{5}
$$

它可以理解为一个对 $(\gamma, \varphi)$，其中：
- $\gamma: \Gamma$ 是当前上下文状态；
- $\varphi: \Gamma \to \Gamma$ 是累加器，即迄今为止所执行效应的逆的复合，也是将上下文恢复到初始状态的函数。

特别地，初始效应上下文可以表示为 $(\gamma_0, \mathrm{id}_\Gamma)$。

</template>
</Bilingual>

<Bilingual>
<template #en>

Given the presence of the accumulator $\varphi$, all effects performed on $\partial\Gamma$ can be tracked and recovered. We now give the concrete constructions for tracking and recovery.

**Definition 3.** Define the transformation track on pairs of context functions:

$$
\begin{array}{rclrrlrrl}\mathrm{track}_\Gamma & : & (\Gamma \to \Gamma) \times (\Gamma \to \Gamma) & \to & \partial\Gamma & \to & \partial\Gamma \\ \mathrm{track}_\Gamma & = & (f, g) & \mapsto & (\gamma, \varphi) & \mapsto & (f(\gamma), \varphi \circ g) \end{array}\tag{6}
$$

This transformation converts a forward function $f$ together with a candidate inverse $g$ into a transformation of the effect context $\partial\Gamma$. Applying $\mathrm{track}_\Gamma(f, g)$ to a state $(\gamma, \varphi)$ transforms $\gamma$ by $f$ and composes the inverse $g$ onto $\varphi$, thereby tracking the effect of $f$ in the context.

</template>
<template #zh>

由于累加器 $\varphi$ 的存在，在 $\partial\Gamma$ 上执行的所有效应都可以被跟踪和恢复。我们现在给出跟踪和恢复的具体构造。

**定义 3.** 定义上下文函数对上的变换 track：

$$
\begin{array}{rclrrlrrl}\mathrm{track}_\Gamma & : & (\Gamma \to \Gamma) \times (\Gamma \to \Gamma) & \to & \partial\Gamma & \to & \partial\Gamma \\ \mathrm{track}_\Gamma & = & (f, g) & \mapsto & (\gamma, \varphi) & \mapsto & (f(\gamma), \varphi \circ g) \end{array}\tag{6}
$$

该变换将前向函数 $f$ 和候选逆 $g$ 转化为效应上下文 $\partial\Gamma$ 的变换。将 $\mathrm{track}_\Gamma(f, g)$ 应用于状态 $(\gamma, \varphi)$ 时，用 $f$ 变换 $\gamma$，将逆 $g$ 复合到 $\varphi$ 上，从而在上下文中跟踪 $f$ 的效应。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Theorem 4.** For every $(f, g) \in (\Gamma \to \Gamma) \times (\Gamma \to \Gamma)$ the following diagram commutes, that is,

$$
\mathrm{pr}_1 \circ \mathrm{track}_\Gamma(f, g) = f \circ \mathrm{pr}_1\tag{7}
$$

</template>
<template #zh>

**定理 4.** 对每个 $(f, g) \in (\Gamma \to \Gamma) \times (\Gamma \to \Gamma)$，以下图表交换，即

$$
\mathrm{pr}_1 \circ \mathrm{track}_\Gamma(f, g) = f \circ \mathrm{pr}_1\tag{7}
$$

</template>
</Bilingual>

![track 的交换图](<A Programming Paradigm for Spatiotemporal Composability/image.jpg>)

<Bilingual>
<template #en>

**Theorem 5.** track is a monoid homomorphism from $\mathfrak{T}_\Gamma$ into $\partial\Gamma \to \partial\Gamma$. That is,
1. $\mathrm{track}_\Gamma(\mathrm{id}_\Gamma, \mathrm{id}_\Gamma) = \mathrm{id}_{\partial\Gamma}$;
2. for all $(f_1, g_1), (f_2, g_2) \in \mathfrak{T}_\Gamma$,

$$
\mathrm{track}_\Gamma((f_1, g_1) \circ (f_2, g_2)) = \mathrm{track}_\Gamma(f_1, g_1) \circ \mathrm{track}_\Gamma(f_2, g_2)\tag{8}
$$

</template>
<template #zh>

**定理 5.** track 是从 $\mathfrak{T}_\Gamma$ 到 $\partial\Gamma \to \partial\Gamma$ 的单子同态。即：
1. $\mathrm{track}_\Gamma(\mathrm{id}_\Gamma, \mathrm{id}_\Gamma) = \mathrm{id}_{\partial\Gamma}$；
2. 对所有 $(f_1, g_1), (f_2, g_2) \in \mathfrak{T}_\Gamma$，

$$
\mathrm{track}_\Gamma((f_1, g_1) \circ (f_2, g_2)) = \mathrm{track}_\Gamma(f_1, g_1) \circ \mathrm{track}_\Gamma(f_2, g_2)\tag{8}
$$

</template>
</Bilingual>

<Bilingual>
<template #en>

**Definition 6.** Define the transformation recover on $\partial\Gamma$:

$$
\begin{array}{rclrrl}\mathrm{recover}_\Gamma & : & \partial\Gamma & \to & \partial\Gamma \\ \mathrm{recover}_\Gamma & = & (\gamma, \varphi) & \mapsto & (\varphi(\gamma), \mathrm{id}_\Gamma) \end{array}\tag{9}
$$

This transformation applies the recovery function $\varphi$ to the current state $\gamma$ and resets $\varphi$ to the identity. The following diagram illustrates how recover recovers the context to its initial state after a sequence of effects $\mathrm{track}(f_1, g_1), \dots, \mathrm{track}(f_n, g_n)$ has been applied to $\partial\Gamma$.

</template>
<template #zh>

**定义 6.** 定义 $\partial\Gamma$ 上的变换 recover：

$$
\begin{array}{rclrrl}\mathrm{recover}_\Gamma & : & \partial\Gamma & \to & \partial\Gamma \\ \mathrm{recover}_\Gamma & = & (\gamma, \varphi) & \mapsto & (\varphi(\gamma), \mathrm{id}_\Gamma) \end{array}\tag{9}
$$

该变换将恢复函数 $\varphi$ 应用于当前状态 $\gamma$，并将 $\varphi$ 重置为恒等。下图说明了在 $\partial\Gamma$ 上应用了一系列效应 $\mathrm{track}(f_1, g_1), \dots, \mathrm{track}(f_n, g_n)$ 后，recover 如何将上下文恢复到初始状态。

</template>
</Bilingual>

<Bilingual>
<template #en>

The diagram shows that the tracked effects followed by recover carry the initial effect context back to itself. What each tracking step preserves is the result of recovery itself, from whatever state it is taken:

**Theorem 7.** For every $(\gamma, \varphi) \in \partial\Gamma$ and every pair $(f, g)$ with $g(f(\gamma)) = \gamma$,

$$
\mathrm{recover}_\Gamma(\mathrm{track}_\Gamma(f, g)(\gamma, \varphi)) = \mathrm{recover}_\Gamma(\gamma, \varphi)\tag{10}
$$

</template>
<template #zh>

该图表明，被跟踪的效应后接 recover 将初始效应上下文带回其自身。每个跟踪步骤所保持的是恢复本身的结果，无论从哪个状态进行恢复：

**定理 7.** 对每个 $(\gamma, \varphi) \in \partial\Gamma$ 和每个满足 $g(f(\gamma)) = \gamma$ 的对 $(f, g)$，

$$
\mathrm{recover}_\Gamma(\mathrm{track}_\Gamma(f, g)(\gamma, \varphi)) = \mathrm{recover}_\Gamma(\gamma, \varphi)\tag{10}
$$

</template>
</Bilingual>

<Bilingual>
<template #en>

A sequence of pairs needs no separate argument. Let $(f_1, g_1), \dots, (f_n, g_n)$ be applied in order from $(\gamma, \varphi)$, and write $\delta_0 = \gamma$ and $\delta_i := f_i(\delta_{i-1})$. By Theorem 5 the composite $\mathrm{track}(f_n, g_n) \circ \dots \circ \mathrm{track}(f_1, g_1)$ is track of the twisted composite $(f_n \circ \dots \circ f_1, g_1 \circ \dots \circ g_n)$, and if $g_i(\delta_i) = \delta_{i-1}$ for every $i$ then $(g_1 \circ \dots \circ g_n)(\delta_n) = \delta_0 = \gamma$. That pair therefore meets the hypothesis of Theorem 7 at $\gamma$, and one application of the theorem gives

$$
\mathrm{recover}_\Gamma((\mathrm{track}_\Gamma(f_n, g_n) \circ \dots \circ \mathrm{track}_\Gamma(f_1, g_1))(\gamma, \varphi)) = \mathrm{recover}_\Gamma(\gamma, \varphi)\tag{11}
$$

Taking $(\gamma, \varphi) = (\gamma_0, \mathrm{id}_\Gamma)$, recovery carries every state reached this way back to $(\gamma_0, \mathrm{id}_\Gamma)$. A pair with $g \circ f = \mathrm{id}_\Gamma$ meets the hypothesis at every state.

</template>
<template #zh>

对于变换对序列不需要单独论证。设 $(f_1, g_1), \dots, (f_n, g_n)$ 从 $(\gamma, \varphi)$ 开始依次应用，记 $\delta_0 = \gamma$、$\delta_i := f_i(\delta_{i-1})$。由定理 5，复合 $\mathrm{track}(f_n, g_n) \circ \dots \circ \mathrm{track}(f_1, g_1)$ 是扭转复合 $(f_n \circ \dots \circ f_1, g_1 \circ \dots \circ g_n)$ 的 track，若 $g_i(\delta_i) = \delta_{i-1}$ 对每个 $i$ 成立，则 $(g_1 \circ \dots \circ g_n)(\delta_n) = \delta_0 = \gamma$。因此该对在 $\gamma$ 处满足定理 7 的假设，应用一次该定理得

$$
\mathrm{recover}_\Gamma((\mathrm{track}_\Gamma(f_n, g_n) \circ \dots \circ \mathrm{track}_\Gamma(f_1, g_1))(\gamma, \varphi)) = \mathrm{recover}_\Gamma(\gamma, \varphi)\tag{11}
$$

取 $(\gamma, \varphi) = (\gamma_0, \mathrm{id}_\Gamma)$，恢复将以这种方式到达的每个状态带回 $(\gamma_0, \mathrm{id}_\Gamma)$。满足 $g \circ f = \mathrm{id}_\Gamma$ 的对在每个状态都满足假设。

</template>
</Bilingual>

<Bilingual>
<template #en>

Recovery reads a state through the quantity $\varphi(\gamma)$, and we refer to $\varphi(\gamma) = \gamma_0$ as the **soundness invariant** of a state in $\partial\Gamma$.

</template>
<template #zh>

恢复通过量 $\varphi(\gamma)$ 读取状态，我们将 $\varphi(\gamma) = \gamma_0$ 称为 $\partial\Gamma$ 中状态的**健全性不变式**。

</template>
</Bilingual>

#### 3.1.2. Revertible Effect Functions

<Bilingual>
<template #en>

The track/recover model of the previous section takes inverses as given a priori: $\mathrm{track}_\Gamma(f, g)$ fixes $g$ before any context state is seen, so one $g$ has to serve every state the effect is applied at. In practice, however, the inverse of each effect is not known a priori: it must be supplied by the caller at the point of effect application. Moreover, recover is all-or-nothing: it cannot selectively undo one effect while retaining others. To address both issues, we enhance the model at both the input and output sides:

</template>
<template #zh>

上一节的 track/recover 模型将逆视为先验给定的：$\mathrm{track}_\Gamma(f, g)$ 在看到任何上下文状态之前就固定了 $g$，因此一个 $g$ 必须服务于效应应用的所有状态。然而在实践中，每个效应的逆并非先验已知的：它必须由调用者在效应应用点提供。此外，recover 是全有或全无的：它不能选择性地撤销一个效应而保留其他效应。为了解决这两个问题，我们在输入和输出两侧增强模型：

</template>
</Bilingual>

<Bilingual>
<template #en>

1. On the input side, we not only transform $\Gamma$ but also return an inverse function alongside it, so that the inverse is supplied where the effect is applied: $\Gamma \to \Gamma \times (\Gamma \to \Gamma)$, i.e., $\Gamma \to \partial\Gamma$.

2. On the output side, we not only transform $\partial\Gamma$ but also return an inverse function alongside it, so that one effect can be undone while the others are retained: $\partial\Gamma \to \partial\Gamma \times (\partial\Gamma \to \partial\Gamma)$, i.e., $\partial\Gamma \to \partial^2\Gamma$.

</template>
<template #zh>

1. 在输入侧，我们不仅变换 $\Gamma$，还返回一个逆函数，使逆在效应应用处提供：$\Gamma \to \Gamma \times (\Gamma \to \Gamma)$，即 $\Gamma \to \partial\Gamma$。

2. 在输出侧，我们不仅变换 $\partial\Gamma$，还返回一个逆函数，使一个效应可以撤销而其他效应保留：$\partial\Gamma \to \partial\Gamma \times (\partial\Gamma \to \partial\Gamma)$，即 $\partial\Gamma \to \partial^2\Gamma$。

</template>
</Bilingual>

<Bilingual>
<template #en>

This enhancement preserves structural consistency between input and output, so we can still define corresponding theory that maintains the mathematical properties of track. The resulting types are the effect functions $\mathfrak{E}_\Gamma$ and their witnessed refinement $\mathfrak{E}_\Gamma^*$:

**Definition 8.** Define the effect function $\mathfrak{E}_\Gamma$ and witnessed effect function $\mathfrak{E}_\Gamma^*$ as:

$$
\begin{array}{rl} & \mathfrak{E}_\Gamma := \Gamma \to \Gamma \times (\Gamma \to \Gamma) \\ & \mathfrak{E}_\Gamma^* := (e: \Gamma \to \Gamma \times (\Gamma \to \Gamma)) \\ & \qquad \times ((\gamma: \Gamma) \to ((\delta: \Gamma) \times (g: \Gamma \to \Gamma) \times ((\delta, g) = e(\gamma) \to g(\delta) = \gamma))) \end{array}\tag{12}
$$

where $e(\gamma)$ yields a pair $(\delta, g)$ representing:
- $\delta: \Gamma$ is the new context;
- $g: \Gamma \to \Gamma$ is the inverse function of the current effect.

An element of $\mathfrak{E}_\Gamma^*$ chooses its inverse per state, and the constraint $g(\delta) = \gamma$ holds that choice to reverting the effect where it was applied, leaving $g$ unconstrained everywhere else. A single $g$ with $g \circ f = \mathrm{id}_\Gamma$ meets the constraint at every state at once, and induces an element of $\mathfrak{E}_\Gamma^*$ by $(f, g) \mapsto \gamma \mapsto (f(\gamma), g)$, which Theorem 11 shows to be a homomorphism. The constraint can be visualized as the following commutative diagram, ensuring that the inverse $g$ returns indeed reverses the transformation at the state where $e$ was applied:

</template>
<template #zh>

这一增强保持了输入和输出之间的结构一致性，因此我们仍然可以定义相应的理论来维持 track 的数学性质。所得类型是效应函数 $\mathfrak{E}_\Gamma$ 及其带见证的精化 $\mathfrak{E}_\Gamma^*$：

**定义 8.** 定义效应函数 $\mathfrak{E}_\Gamma$ 和带见证效应函数 $\mathfrak{E}_\Gamma^*$ 为：

$$
\begin{array}{rl} & \mathfrak{E}_\Gamma := \Gamma \to \Gamma \times (\Gamma \to \Gamma) \\ & \mathfrak{E}_\Gamma^* := (e: \Gamma \to \Gamma \times (\Gamma \to \Gamma)) \\ & \qquad \times ((\gamma: \Gamma) \to ((\delta: \Gamma) \times (g: \Gamma \to \Gamma) \times ((\delta, g) = e(\gamma) \to g(\delta) = \gamma))) \end{array}\tag{12}
$$

其中 $e(\gamma)$ 产生对 $(\delta, g)$，表示：
- $\delta: \Gamma$ 是新上下文；
- $g: \Gamma \to \Gamma$ 是当前效应的逆函数。

$\mathfrak{E}_\Gamma^*$ 的元素按状态选择其逆，约束 $g(\delta) = \gamma$ 使该选择在效应应用处撤销效应，而 $g$ 在其他地方不受约束。单个满足 $g \circ f = \mathrm{id}_\Gamma$ 的 $g$ 一次满足所有状态的约束，并通过 $(f, g) \mapsto \gamma \mapsto (f(\gamma), g)$ 诱导出 $\mathfrak{E}_\Gamma^*$ 的一个元素，定理 11 表明这是同态。该约束可以可视化为以下交换图，确保返回的逆 $g$ 确实撤销了 $e$ 被应用处状态上的变换：

</template>
</Bilingual>

![见证条件的交换图](<A Programming Paradigm for Spatiotemporal Composability/image-1.jpg>)

<Bilingual>
<template #en>

Since effect functions $\mathfrak{E}_\Gamma$ are no longer endomorphisms on the context, they cannot be directly composed. We therefore define a new operation for effect composition:

**Definition 9.** Given functions $f, g \in \mathfrak{E}_\Gamma$, define their effect composition $f \diamond g$ as:

$$
\begin{array}{rcl}f \diamond g &:& \Gamma \to \partial\Gamma \\ && \text{let } (\delta, s) = g(\gamma) \text{ in} \\ f \diamond g &=& \gamma \mapsto \text{let } (\varepsilon, t) = f(\delta) \text{ in} \\ && (\varepsilon, s \circ t)\end{array}\tag{13}
$$

</template>
<template #zh>

由于效应函数 $\mathfrak{E}_\Gamma$ 不再是上下文上的自同态，它们不能直接复合。因此我们定义新的效应复合操作：

**定义 9.** 给定函数 $f, g \in \mathfrak{E}_\Gamma$，定义它们的效应复合 $f \diamond g$ 为：

$$
\begin{array}{rcl}f \diamond g &:& \Gamma \to \partial\Gamma \\ && \text{let } (\delta, s) = g(\gamma) \text{ in} \\ f \diamond g &=& \gamma \mapsto \text{let } (\varepsilon, t) = f(\delta) \text{ in} \\ && (\varepsilon, s \circ t)\end{array}\tag{13}
$$

</template>
</Bilingual>

<Bilingual>
<template #en>

**Theorem 10.** Effect composition carries the monoid structure of $\mathfrak{T}_\Gamma$ over to $\mathfrak{E}_\Gamma$. That is,
1. $(\mathfrak{E}_\Gamma, \diamond)$ is a monoid with unit $\eta_\Gamma := \gamma \mapsto (\gamma, \mathrm{id}_\Gamma)$;
2. the assignment $(f, g) \mapsto \gamma \mapsto (f(\gamma), g)$ is a monoid homomorphism from $\mathfrak{T}_\Gamma$ into $\mathfrak{E}_\Gamma$.

**Theorem 11.** Witnessing survives effect composition, and a uniform inverse witnesses at every state. That is,
1. $\mathfrak{E}^*$ is a submonoid of $\mathfrak{E}_\Gamma$;
2. the homomorphism of Theorem 10 carries every pair with $g \circ f = \mathrm{id}_\Gamma$ into $\mathfrak{E}_\Gamma^*$.

</template>
<template #zh>

**定理 10.** 效应复合将 $\mathfrak{T}_\Gamma$ 的单子结构传递到 $\mathfrak{E}_\Gamma$。即：
1. $(\mathfrak{E}_\Gamma, \diamond)$ 是以 $\eta_\Gamma := \gamma \mapsto (\gamma, \mathrm{id}_\Gamma)$ 为单位的单子；
2. 指派 $(f, g) \mapsto \gamma \mapsto (f(\gamma), g)$ 是从 $\mathfrak{T}_\Gamma$ 到 $\mathfrak{E}_\Gamma$ 的单子同态。

**定理 11.** 见证在效应复合中存活，且一致逆在每个状态都提供见证。即：
1. $\mathfrak{E}^*$ 是 $\mathfrak{E}_\Gamma$ 的子单子；
2. 定理 10 的同态将每个满足 $g \circ f = \mathrm{id}_\Gamma$ 的对映射到 $\mathfrak{E}_\Gamma^*$ 中。

</template>
</Bilingual>

<Bilingual>
<template #en>

Just as track lifts a pair of transformations on $\Gamma$ to $\partial\Gamma$, we define effect to lift $\mathfrak{E}_\Gamma$ to $\mathfrak{E}_{\partial\Gamma}$:

**Definition 12.** Define the effect function transformation effect as:

$$
\begin{array}{rclrrlrrl}\mathrm{effect}_\Gamma&:&\mathfrak{E}_\Gamma&\to&\partial\Gamma&\to&\partial^2\Gamma\\\mathrm{effect}_\Gamma&=&e&\mapsto&(\gamma, \varphi)&\mapsto&\text{let } (\delta, g) = e(\gamma) \text{ in}\\&&&&&&((\delta, \varphi \circ g), \mathrm{track}_\Gamma(g, \mathrm{pr}_1 \circ e))\end{array}\tag{14}
$$

Since $\mathrm{effect}_\Gamma(e)$ is itself $\mathfrak{E}_{\partial\Gamma}$, what it returns is an inverse in the sense of Definition 8 read one level up. That inverse is itself a track of the pair obtained by swapping the two directions of the effect. The ordinary tracking rule applies once more: undoing the effect is an effect in its own right, transforming the state by $g$, and the way to undo that is to perform the effect again, which is what $\mathrm{pr}_1 \circ e$ does. The inverse therefore composes onto the accumulator it is handed, exactly as track prescribes.

</template>
<template #zh>

正如 track 将 $\Gamma$ 上的变换对提升到 $\partial\Gamma$，我们定义 effect 将 $\mathfrak{E}_\Gamma$ 提升到 $\mathfrak{E}_{\partial\Gamma}$：

**定义 12.** 定义效应函数变换 effect 为：

$$
\begin{array}{rclrrlrrl}\mathrm{effect}_\Gamma&:&\mathfrak{E}_\Gamma&\to&\partial\Gamma&\to&\partial^2\Gamma\\\mathrm{effect}_\Gamma&=&e&\mapsto&(\gamma, \varphi)&\mapsto&\text{let } (\delta, g) = e(\gamma) \text{ in}\\&&&&&&((\delta, \varphi \circ g), \mathrm{track}_\Gamma(g, \mathrm{pr}_1 \circ e))\end{array}\tag{14}
$$

由于 $\mathrm{effect}_\Gamma(e)$ 本身是 $\mathfrak{E}_{\partial\Gamma}$，它返回的是定义 8 在高一层读取的逆。该逆本身是通过交换效应的两个方向所得对的 track。普通的跟踪规则再次适用：撤销效应本身也是一种效应，用 $g$ 变换状态，而撤销它的方式是再次执行该效应，这正是 $\mathrm{pr}_1 \circ e$ 所做的。因此逆复合到它所接收的累加器上，正如 track 所规定的。

</template>
</Bilingual>

<Bilingual>
<template #en>

We can now prove properties for effect analogous to those of track.

**Theorem 13.** effect preserves the $\diamond$ operation. That is, $\forall f, g \in \mathfrak{E}_\Gamma$

$$
\mathrm{effect}_\Gamma(f) \diamond \mathrm{effect}_\Gamma(g) = \mathrm{effect}_\Gamma(f \diamond g)\tag{15}
$$

</template>
<template #zh>

我们现在可以证明 effect 的性质类似于 track 的性质。

**定理 13.** effect 保持 $\diamond$ 运算。即 $\forall f, g \in \mathfrak{E}_\Gamma$

$$
\mathrm{effect}_\Gamma(f) \diamond \mathrm{effect}_\Gamma(g) = \mathrm{effect}_\Gamma(f \diamond g)\tag{15}
$$

</template>
</Bilingual>

<Bilingual>
<template #en>

How the two levels relate is what the following diagram shows. Its upper triangle is the witness condition of $e$, according to Definition 8, and its lower triangle is the question of whether $e'$ is witnessed the way $e$ is.

</template>
<template #zh>

两层之间的关系由下图展示。其上三角是 $e$ 的见证条件（根据定义 8），下三角是 $e'$ 是否以与 $e$ 相同的方式被见证的问题。

</template>
</Bilingual>

![两层关系的交换图](<A Programming Paradigm for Spatiotemporal Composability/image-2.jpg>)

<Bilingual>
<template #en>

Between the levels, the projection $\mathrm{pr}_1$ relates each lifted map to the map it lifts, as it does for track in Theorem 4.

**Theorem 14.** Let $e \in \mathfrak{E}_\Gamma$, write $f := \mathrm{pr}_1 \circ e$, and let $e' := \mathrm{effect}_\Gamma(e)$ with forward map $f' := \mathrm{pr}_1 \circ e'$. Then
1. $\mathrm{pr}_1 \circ f' = f \circ \mathrm{pr}_1$;
2. for each $(\gamma, \varphi) \in \partial\Gamma$, the lifted inverse $g' := \mathrm{pr}_2(e'(\gamma, \varphi))$ and the inverse $g := \mathrm{pr}_2(e(\gamma))$ witnessed there satisfy $\mathrm{pr}_1 \circ g' = g \circ \mathrm{pr}_1$.

</template>
<template #zh>

在两层之间，投影 $\mathrm{pr}_1$ 将每个提升的映射与其所提升的映射关联，正如定理 4 中对 track 所做的。

**定理 14.** 设 $e \in \mathfrak{E}_\Gamma$，记 $f := \mathrm{pr}_1 \circ e$，令 $e' := \mathrm{effect}_\Gamma(e)$，其前向映射 $f' := \mathrm{pr}_1 \circ e'$。则
1. $\mathrm{pr}_1 \circ f' = f \circ \mathrm{pr}_1$；
2. 对每个 $(\gamma, \varphi) \in \partial\Gamma$，提升的逆 $g' := \mathrm{pr}_2(e'(\gamma, \varphi))$ 与该处见证的逆 $g := \mathrm{pr}_2(e(\gamma))$ 满足 $\mathrm{pr}_1 \circ g' = g \circ \mathrm{pr}_1$。

</template>
</Bilingual>

<Bilingual>
<template #en>

Whether the lower triangle closes is settled by computing what the lifted inverse returns:

**Theorem 15.** Let $e \in \mathfrak{E}_\Gamma^*$ and write $f := \mathrm{pr}_1 \circ e$. Fix $(\gamma, \varphi) \in \partial\Gamma$, let $(\delta, g) = e(\gamma)$, and write $(\Delta, g')$ for the value of $\mathrm{effect}_\Gamma(e)$ at $(\gamma, \varphi)$. Then

$$
g'(\Delta) = (\gamma, \varphi \circ g \circ f)\tag{16}
$$

The state is recovered exactly. The accumulator is restored as well, equivalently $\mathrm{effect}_\Gamma(e) \in \mathfrak{E}_{\partial\Gamma}^*$, if and only if $g \circ f = \mathrm{id}_\Gamma$; and in every case $(\varphi \circ g \circ f)(\gamma) = \varphi(\gamma)$, so the soundness invariant is preserved.

</template>
<template #zh>

下三角是否闭合可以通过计算提升逆的返回值来确定：

**定理 15.** 设 $e \in \mathfrak{E}_\Gamma^*$，记 $f := \mathrm{pr}_1 \circ e$。固定 $(\gamma, \varphi) \in \partial\Gamma$，令 $(\delta, g) = e(\gamma)$，记 $(\Delta, g')$ 为 $\mathrm{effect}_\Gamma(e)$ 在 $(\gamma, \varphi)$ 处的值。则

$$
g'(\Delta) = (\gamma, \varphi \circ g \circ f)\tag{16}
$$

状态被精确恢复。当且仅当 $g \circ f = \mathrm{id}_\Gamma$ 时，累加器也被恢复，等价地 $\mathrm{effect}_\Gamma(e) \in \mathfrak{E}_{\partial\Gamma}^*$；且在所有情况下 $(\varphi \circ g \circ f)(\gamma) = \varphi(\gamma)$，因此健全性不变式得以保持。

</template>
</Bilingual>

<Bilingual>
<template #en>

The lower triangle therefore closes only when the inverse witnessed at $\gamma$ reverts $f$ at every state, so effect does not carry $\mathfrak{E}_\Gamma^*$ into $\mathfrak{E}_{\partial\Gamma}^*$. What holds in every case is agreement at $\gamma$: $\mathrm{recover}_\Gamma(g'(\Delta)) = \mathrm{recover}_\Gamma(\gamma, \varphi)$, which is the whole of what Theorem 7 assumes of an accumulator, so reverting leaves the recovery target untouched.

</template>
<template #zh>

因此，下三角仅在 $\gamma$ 处见证的逆在每个状态都撤销 $f$ 时才闭合，所以 effect 不将 $\mathfrak{E}_\Gamma^*$ 映射到 $\mathfrak{E}_{\partial\Gamma}^*$ 中。在所有情况下成立的是在 $\gamma$ 处的一致性：$\mathrm{recover}_\Gamma(g'(\Delta)) = \mathrm{recover}_\Gamma(\gamma, \varphi)$，这正是定理 7 对累加器所做的全部假设，因此撤销不会影响恢复目标。

</template>
</Bilingual>

<Bilingual>
<template #en>

Reverting effects in the reverse of the order in which they were applied requires nothing further, because each inverse then meets the state its own application produced:

**Theorem 16.** Let $e_1, \dots, e_n \in \mathfrak{E}_\Gamma^*$ be applied in order from $(\gamma_0, \mathrm{id}_\Gamma)$ and reverted in the reverse order. Then
1. each revert recovers the context state its application ran against;
2. every intermediate state satisfies the soundness invariant.

</template>
<template #zh>

按应用顺序的逆序撤销效应不需要更多条件，因为每个逆此时遇到的是其自身应用所产生的状态：

**定理 16.** 设 $e_1, \dots, e_n \in \mathfrak{E}_\Gamma^*$ 从 $(\gamma_0, \mathrm{id}_\Gamma)$ 开始依次应用，并按逆序撤销。则
1. 每次撤销恢复其应用时所运行处的上下文状态；
2. 每个中间状态满足健全性不变式。

</template>
</Bilingual>

#### 3.1.3. Independence of Effects

<Bilingual>
<template #en>

Reverting an effect at the state its own application produced is what Theorem 16 covers; reverting one at any other state is what this subsection covers. Two situations call for the latter. An inverse may be run while later effects are still in place, which is what withdrawing one component from a running system amounts to; and one sequence may interleave the effects of several components, each keeping the inverses of its own, so that the inverses of one component are separated by the applications of another. In both an inverse meets a state that foreign effects have moved, and whether it still reverts what it was built to revert is a question of commutation: what has to commute is every transformation one effect can perform with every transformation the other can perform, forward map and yielded inverse alike. A single accumulator settles neither situation, $\varphi$ being a composite that runs every inverse it holds in one order and all at once.

</template>
<template #zh>

在效应自身应用所产生的状态处撤销效应由定理 16 覆盖；在任何其他状态处撤销则由本小节覆盖。两种情况需要后者。一个逆可能在后续效应仍然存在时运行，这正是从运行系统中撤回一个组件所意味的；一个序列也可能交错多个组件的效应，每个组件保持自己的逆，使得一个组件的逆被另一个组件的应用所分隔。在两种情况下，逆遇到的是一个被外来效应移动过的状态，它是否仍然撤销了它所构建来撤销的东西是一个交换问题：需要交换的是一个效应能执行的每个变换与另一个效应能执行的每个变换，前向映射和产生的逆 alike。单一累加器无法解决任一情况，$\varphi$ 是一个以一个顺序一次性运行其持有的所有逆的复合。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Definition 17.** For an effect function $e \in \mathfrak{E}_\Gamma$, the transformation monoid $\mathfrak{M}(e)$ is the submonoid of $\Gamma \to \Gamma$ generated by the forward map of $e$ together with every inverse $e$ yields, and the generators of $\mathfrak{M}(e)$ are the elements of that generating set:

$$
\mathfrak{M}(e) := \left\langle \left\{\mathrm{pr}_1 \circ e\right\} \cup \left\{\mathrm{pr}_2(e(\gamma)) \mid \gamma \in \Gamma\right\} \right\rangle\tag{17}
$$

</template>
<template #zh>

**定义 17.** 对于效应函数 $e \in \mathfrak{E}_\Gamma$，变换单子 $\mathfrak{M}(e)$ 是 $\Gamma \to \Gamma$ 的子单子，由 $e$ 的前向映射和 $e$ 产生的每个逆生成，$\mathfrak{M}(e)$ 的生成元是该生成集的元素：

$$
\mathfrak{M}(e) := \left\langle \left\{\mathrm{pr}_1 \circ e\right\} \cup \left\{\mathrm{pr}_2(e(\gamma)) \mid \gamma \in \Gamma\right\} \right\rangle\tag{17}
$$

</template>
</Bilingual>

<Bilingual>
<template #en>

**Definition 19.** Effect functions $e_1, e_2 \in \mathfrak{E}_\Gamma$ are **independent** when
1. every transformation of one commutes with every transformation of the other,

$$
\forall f \in \mathfrak{M}(e_1), g \in \mathfrak{M}(e_2). \quad f \circ g = g \circ f\tag{18}
$$

2. neither one's transformations disturb the inverse the other yields,

$$
\forall g \in \mathfrak{M}(e_2), \gamma \in \Gamma. \quad \mathrm{pr}_2(e_1(g(\gamma))) = \mathrm{pr}_2(e_1(\gamma))\tag{19}
$$

and the same with $e_1$ and $e_2$ exchanged.

</template>
<template #zh>

**定义 19.** 效应函数 $e_1, e_2 \in \mathfrak{E}_\Gamma$ 是**独立的**，当
1. 一个的每个变换与另一个的每个变换交换，

$$
\forall f \in \mathfrak{M}(e_1), g \in \mathfrak{M}(e_2). \quad f \circ g = g \circ f\tag{18}
$$

2. 一个的变换不干扰另一个产生的逆，

$$
\forall g \in \mathfrak{M}(e_2), \gamma \in \Gamma. \quad \mathrm{pr}_2(e_1(g(\gamma))) = \mathrm{pr}_2(e_1(\gamma))\tag{19}
$$

以及 $e_1$ 和 $e_2$ 交换后的对称条件。

</template>
</Bilingual>

<Bilingual>
<template #en>

Under independence an inverse may be run at a state later effects have moved, and what it withdraws there is its own contribution and nothing else:

**Theorem 20.** Let $e_1, \dots, e_n \in \mathfrak{E}_\Gamma^*$ be pairwise independent and applied in order from $\gamma_0$. Write $f_i := \mathrm{pr}_1 \circ e_i$, let $\delta_i := f_i(\delta_{i-1})$ with $\delta_0 := \gamma_0$, and let $g_i := \mathrm{pr}_2(e_i(\delta_{i-1}))$ be the inverse $e_i$ yields where it is applied. Fix $j$ and write $\delta_u' := (f_u \circ \dots \circ f_{j+1})(\delta_{j-1})$ for the states of the sequence with $e_j$ omitted, so that $\delta_j' = \delta_{j-1}$. Then for every $u$ with $j \leq u \leq n$
1. $\delta_u = f_j(\delta_u')$ and $g_j(\delta_u) = \delta_u'$,
2. each $e_i$ with $i > j$ yields at $\delta_{i-1}'$ the same inverse $g_i$ it yields at $\delta_{i-1}$.

**Corollary 21.** Let $e_1, \dots, e_n \in \mathfrak{E}_\Gamma^*$ be pairwise independent and applied in order from $\gamma_0$, and let $g_1, \dots, g_n$ be as above. Applying the $n$ inverses at $\delta_n$ in the order of any permutation of $\{1, \dots, n\}$ reaches $\gamma_0$.

</template>
<template #zh>

在独立性下，一个逆可以在后续效应移动过的状态处运行，它在那里撤回的是自身的贡献而非其他：

**定理 20.** 设 $e_1, \dots, e_n \in \mathfrak{E}_\Gamma^*$ 两两独立，从 $\gamma_0$ 开始依次应用。记 $f_i := \mathrm{pr}_1 \circ e_i$，令 $\delta_i := f_i(\delta_{i-1})$，$\delta_0 := \gamma_0$，令 $g_i := \mathrm{pr}_2(e_i(\delta_{i-1}))$ 为 $e_i$ 在其应用处产生的逆。固定 $j$，记 $\delta_u' := (f_u \circ \dots \circ f_{j+1})(\delta_{j-1})$ 为省略 $e_j$ 后序列的状态，使得 $\delta_j' = \delta_{j-1}$。则对每个满足 $j \leq u \leq n$ 的 $u$
1. $\delta_u = f_j(\delta_u')$ 且 $g_j(\delta_u) = \delta_u'$，
2. 每个 $i > j$ 的 $e_i$ 在 $\delta_{i-1}'$ 处产生与在 $\delta_{i-1}$ 处相同的逆 $g_i$。

**推论 21.** 设 $e_1, \dots, e_n \in \mathfrak{E}_\Gamma^*$ 两两独立，从 $\gamma_0$ 开始依次应用，$g_1, \dots, g_n$ 如上。在 $\delta_n$ 处按 $\{1, \dots, n\}$ 的任意排列顺序应用 $n$ 个逆，到达 $\gamma_0$。

</template>
</Bilingual>

<Bilingual>
<template #en>

LIFO order is one such permutation, and Theorem 16 reverts in it with no hypothesis at all. What independence buys is every other order, and with it the sequence that interleaves several components, which Section 4.4.2 carries to a trace of a whole system.

</template>
<template #zh>

LIFO 顺序是这样一个排列，定理 16 在其中撤销时不需要任何假设。独立性所获得的是所有其他顺序，以及随之而来的交错多个组件的序列，第 4.4.2 节将其推广到整个系统的迹。

</template>
</Bilingual>

<Bilingual>
<template #en>

Together, these constructions constitute revertible effects: each effect function in $\mathfrak{E}_\Gamma^*$ explicitly provides its own inverse, effect tracks these inverses on the effect context $\partial\Gamma$, and the $\diamond$ operation composes them while preserving revertibility. What they deliver is local temporal composability, local in that the guarantee is read off one component's effects taken by themselves. We take that to be the following criterion: for every sequence of effect functions a component applies, the accumulator recovers the context it began at (Theorem 7), and reverting the sequence hands each inverse the state its own application ran against (Theorem 16). Loading a component is applying such a sequence and accumulating its inverses in $\varphi$; unloading it is applying $\varphi$.

</template>
<template #zh>

这些构造共同构成了可逆效应：$\mathfrak{E}_\Gamma^*$ 中的每个效应函数显式提供自己的逆，effect 在效应上下文 $\partial\Gamma$ 上跟踪这些逆，$\diamond$ 运算在保持可逆性的同时组合它们。它们所交付的是局部时间可组合性，"局部"在于保证是从单一组件自身的效应中读出的。我们将其作为以下准则：对于组件应用的每个效应函数序列，累加器恢复其起始的上下文（定理 7），且撤销序列时每个逆遇到其自身应用所运行处的状态（定理 16）。加载组件是应用这样的序列并在 $\varphi$ 中积累其逆；卸载组件是应用 $\varphi$。

</template>
</Bilingual>

### 3.2. Reactive Coeffects

<Bilingual>
<template #en>

Spatial composability is the ability for components to declare dependencies on one another and for the system to resolve, provide, and withdraw those dependencies at runtime. This requires that dependency satisfaction be re-evaluated whenever the shared context changes, so that a component activates when its dependencies become available and deactivates when they are withdrawn. We therefore model dependencies of a component as a specification and classify each change to the context, against that specification, as activating, deactivating, or neutral. Classifying against the specification is what detects a change in satisfaction; responding to that classification is what drives activation and deactivation. We call such coeffects **reactive**: by classifying context changes and driving activation and deactivation from them, correct coeffect ordering becomes a structural guarantee.

</template>
<template #zh>

空间可组合性是组件声明彼此依赖、系统在运行时解析、提供和撤销这些依赖的能力。这要求依赖满足性在共享上下文每次变化时被重新评估，使得组件在其依赖变为可用时激活，在依赖被撤销时去激活。因此，我们将组件的依赖建模为规格，并根据该规格将上下文的每次变更分类为激活、去激活或中性。根据规格分类是检测满足性变化的方式；响应该分类是驱动激活和去激活的方式。我们称这样的协效应为**响应式的**：通过分类上下文变更并从中驱动激活和去激活，正确的协效应排序成为结构性保证。

</template>
</Bilingual>

#### 3.2.1. Coeffect Context

<Bilingual>
<template #en>

Traditional inversion-of-control (IoC) containers [38] typically model dependencies as simple key-value mappings. This section formalizes IoC as a coeffect context that synergizes with revertible effects to provide a mathematical foundation for dynamic composition.

**Definition 22.** Given a type family $\nu: K \to \text{Type}$, define the coeffect context as the dependent partial function type:

$$
\Sigma := (k: K) \rightharpoonup \mathcal{V}_k\tag{20}
$$

where $\sigma: \Sigma$ is a finite partial function assigning to each $k \in \mathrm{dom}(\sigma) \subseteq K$ a value of type $\nu_k$. The use of a type family $\nu$ ensures that each dependency key $k$ is associated with a specific value type $\nu_k$, providing static type safety for dependency access.

</template>
<template #zh>

传统控制反转（IoC）容器 [38] 通常将依赖建模为简单的键值映射。本节将 IoC 形式化为协效应上下文，它与可逆效应协同，为动态组合提供数学基础。

**定义 22.** 给定类型族 $\nu: K \to \text{Type}$，定义协效应上下文为依赖偏函数类型：

$$
\Sigma := (k: K) \rightharpoonup \mathcal{V}_k\tag{20}
$$

其中 $\sigma: \Sigma$ 是有限偏函数，为每个 $k \in \mathrm{dom}(\sigma) \subseteq K$ 赋予类型 $\nu_k$ 的值。使用类型族 $\nu$ 确保每个依赖键 $k$ 关联到特定的值类型 $\nu_k$，为依赖访问提供静态类型安全。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Definition 23.** The get and set operations on $\Sigma$ are defined as:

$$
\begin{array}{rclrrlrrl}\text{get}&:&(k: K)&\to&\Sigma&\rightharpoonup&\mathcal{V}_k\\\text{get}&=&k&\mapsto&\sigma&\mapsto&\sigma(k)\\\text{set}&:&(k: K) \times \mathcal{V}_k&\to&\Sigma&\rightharpoonup&\Sigma \times (\Sigma \rightharpoonup \Sigma)\\\text{set}&=&(k, v)&\mapsto&\sigma&\mapsto&(\sigma[k \mapsto v], \lambda \sigma'. \sigma' \setminus k)\end{array}\tag{21}
$$

Notably, $\text{set}(k, v)$ has type $\mathfrak{E}_\Sigma^*$, precisely an effect function on the coeffect context. We can therefore directly apply the effect machinery from Section 3.1: effect provides automatic tracking and recovery of dependency registrations. This is the synergy between reactive coeffects and revertible effects: coeffect operations are effects, and effects are revertible.

</template>
<template #zh>

**定义 23.** $\Sigma$ 上的 get 和 set 操作定义为：

$$
\begin{array}{rclrrlrrl}\text{get}&:&(k: K)&\to&\Sigma&\rightharpoonup&\mathcal{V}_k\\\text{get}&=&k&\mapsto&\sigma&\mapsto&\sigma(k)\\\text{set}&:&(k: K) \times \mathcal{V}_k&\to&\Sigma&\rightharpoonup&\Sigma \times (\Sigma \rightharpoonup \Sigma)\\\text{set}&=&(k, v)&\mapsto&\sigma&\mapsto&(\sigma[k \mapsto v], \lambda \sigma'. \sigma' \setminus k)\end{array}\tag{21}
$$

值得注意的是，$\text{set}(k, v)$ 的类型为 $\mathfrak{E}_\Sigma^*$，恰好是协效应上下文上的效应函数。因此我们可以直接应用第 3.1 节的效应机制：effect 提供依赖注册的自动跟踪和恢复。这就是响应式协效应与可逆效应之间的协同：协效应操作是效应，而效应是可逆的。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Definition 24.** A coeffect at a key $k$ is a triple $(\mathcal{V}_k, \simeq_k, \mathcal{A}_k)$, where $\nu_k$ is the value type of Definition 22, $\simeq_k$ is an equivalence relation on $\nu_k$ up to which values at $k$ are compared (Section 3.3.2), and $\mathcal{A}_k$ is a set of coeffect operations, the operations the value bound at $k$ provides to a component holding it. An operation $a \in \mathcal{A}_k$ carries an argument type $X_a$ and an outcome type $B_a$, and acts on the value alone:

$$
a: X_a \to \mathcal{V}_k \rightharpoonup \mathcal{V}_k \times (\mathcal{V}_k \rightharpoonup \mathcal{V}_k) \times B_a\tag{22}
$$

its first two constituents forming an effect function on $\nu_k$ witnessed as Definition 8 requires, and its third an outcome.

</template>
<template #zh>

**定义 24.** 键 $k$ 处的协效应是一个三元组 $(\mathcal{V}_k, \simeq_k, \mathcal{A}_k)$，其中 $\nu_k$ 是定义 22 的值类型，$\simeq_k$ 是 $\nu_k$ 上的等价关系，键 $k$ 处的值按此关系比较（第 3.3.2 节），$\mathcal{A}_k$ 是一组协效应操作，即绑定在 $k$ 处的值向持有它的组件提供的操作。操作 $a \in \mathcal{A}_k$ 携带参数类型 $X_a$ 和结果类型 $B_a$，仅作用于值本身：

$$
a: X_a \to \mathcal{V}_k \rightharpoonup \mathcal{V}_k \times (\mathcal{V}_k \rightharpoonup \mathcal{V}_k) \times B_a\tag{22}
$$

其前两个组成部分构成 $\nu_k$ 上的效应函数（按定义 8 的要求被见证），第三个是结果。

</template>
</Bilingual>

#### 3.2.2. Specification and Notification

<Bilingual>
<template #en>

The preceding definitions describe how individual dependencies are registered and accessed. Accessing an absent dependency, however, is a runtime failure. A component should therefore activate only once all the dependencies it declares are present, rather than accessing them optimistically and failing when one is missing. This raises two questions: whether a component's declared dependencies are jointly satisfied, and how the system should respond when that status changes. The coeffect context $\Sigma$ carries a natural observational structure that makes both questions tractable: for any coeffect specification $d \subseteq K$, define the satisfaction predicate:

$$
\sigma \vDash d := \forall k \in d. \, k \in \mathrm{dom}(\sigma)\tag{24}
$$

This predicate is decidable (since $\mathrm{dom}(\sigma)$ is finite). Since all mutations to $\sigma$ pass through effect functions (whose inverses recover the previous domain), changes to satisfaction are detectable at each effect boundary. This is the algebraic basis of reactivity: the effect system guarantees that every coeffect change is observed.

</template>
<template #zh>

前面的定义描述了单个依赖如何被注册和访问。然而，访问不存在的依赖是运行时错误。因此，组件应该仅在其声明的所有依赖都存在时才激活，而不是乐观地访问它们并在某个缺失时失败。这引出两个问题：组件声明的依赖是否联合满足，以及当该状态变化时系统应如何响应。协效应上下文 $\Sigma$ 带有自然的观察结构，使两个问题都可处理：对于任何协效应规格 $d \subseteq K$，定义满足谓词：

$$
\sigma \vDash d := \forall k \in d. \, k \in \mathrm{dom}(\sigma)\tag{24}
$$

该谓词是可判定的（因为 $\mathrm{dom}(\sigma)$ 是有限的）。由于 $\sigma$ 的所有变更都通过效应函数进行（其逆恢复之前的域），满足性的变化在每个效应边界处可检测。这是响应性的代数基础：效应系统保证每个协效应变化都被观察到。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Definition 26.** Given a coeffect specification $d \subseteq K$ and states $\sigma, \sigma' \in \Sigma$, define:

$$
\text{notify}_d(\sigma, \sigma') := \left\{\begin{array}{ll}\text{activating} & \text{if } \sigma \not\vDash d \land \sigma' \vDash d \\\text{deactivating} & \text{if } \sigma \vDash d \land \sigma' \not\vDash d \\\text{neutral} & \text{otherwise}\end{array}\right.\tag{26}
$$

The reactive invariant is: an activating transition triggers execution of the component's effects (with full effect tracking), whereas a deactivating transition triggers recovery by applying the accumulator.

</template>
<template #zh>

**定义 26.** 给定协效应规格 $d \subseteq K$ 和状态 $\sigma, \sigma' \in \Sigma$，定义：

$$
\text{notify}_d(\sigma, \sigma') := \left\{\begin{array}{ll}\text{activating（激活）} & \text{若 } \sigma \not\vDash d \land \sigma' \vDash d \\\text{deactivating（去激活）} & \text{若 } \sigma \vDash d \land \sigma' \not\vDash d \\\text{neutral（中性）} & \text{否则}\end{array}\right.\tag{26}
$$

响应式不变式为：激活转换触发组件效应的执行（带有完整的效应跟踪），而去激活转换通过应用累加器触发恢复。

</template>
</Bilingual>

#### 3.2.3. Isolation and Interception

<Bilingual>
<template #en>

The basic coeffect context $\Sigma$ models a flat dependency table. In practice, however, the system may need to bind distinct values to the same logical dependency for different components. This section extends the coeffect context with two mechanisms: **coeffect isolation** (the same key resolves differently in different contexts) and **coeffect interception** (cross-cutting behavior on dependency access).

**Coeffect Isolation.** By introducing isolation realms, coeffect isolation allows the same dependency to bind to different values in different contexts. This has broad applications in multitenant systems, testing environments, and component sandboxes.

**Definition 28.** Define the coeffect context with isolation as:

$$
\Sigma^{\mathrm{iso}} := (K \rightharpoonup R) \times ((r: R) \rightharpoonup \mathcal{V}_r)\tag{27}
$$

The two-layer mapping structure decouples the logical layer from the storage layer, making dependency access context-aware. When accessing a key $k$, the system first resolves $\rho(k)$ to obtain a realm identifier $r$, then accesses $\sigma(r)$ for the actual value.

</template>
<template #zh>

基本协效应上下文 $\Sigma$ 建模的是扁平依赖表。然而在实践中，系统可能需要为不同组件将不同的值绑定到相同的逻辑依赖。本节用两种机制扩展协效应上下文：**协效应隔离**（同一键在不同上下文中解析不同）和**协效应拦截**（依赖访问上的横切行为）。

**协效应隔离。** 通过引入隔离域，协效应隔离允许同一依赖在不同上下文中绑定到不同的值。这在多租户系统、测试环境和组件沙箱中有广泛应用。

**定义 28.** 定义带隔离的协效应上下文为：

$$
\Sigma^{\mathrm{iso}} := (K \rightharpoonup R) \times ((r: R) \rightharpoonup \mathcal{V}_r)\tag{27}
$$

两层映射结构将逻辑层与存储层解耦，使依赖访问具有上下文感知能力。访问键 $k$ 时，系统先解析 $\rho(k)$ 获得域标识符 $r$，再访问 $\sigma(r)$ 获取实际值。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Coeffect Interception.** The second mechanism, coeffect interception, attaches cross-cutting metadata to dependency access, adding behavior without modifying the dependency value. This metadata can be either context-carried or component-declared, so we extend both the coeffect context and the coeffect specification.

When a component with specification $d$ accesses key $k$, the system evaluates $\sigma(k)(d(k) \oplus_k \iota(k))$: the component-declared metadata is merged with the context-carried metadata $\iota$, and the provider function is applied to the result. This merge follows each key's own semantics and is right-biased, so $\iota(k)$ takes priority and can override the component's declaration, letting an enclosing context constrain how a component uses a coeffect without modifying that component.

</template>
<template #zh>

**协效应拦截。** 第二种机制——协效应拦截——将横切元数据附加到依赖访问上，在不修改依赖值的情况下添加行为。该元数据可以由上下文携带或由组件声明，因此我们同时扩展协效应上下文和协效应规格。

当规格为 $d$ 的组件访问键 $k$ 时，系统求值 $\sigma(k)(d(k) \oplus_k \iota(k))$：组件声明的元数据与上下文携带的元数据 $\iota$ 合并，提供者函数应用于结果。该合并遵循每个键自身的语义且右偏，因此 $\iota(k)$ 优先并可以覆盖组件的声明，使得外层上下文可以约束组件如何使用协效应而无需修改该组件。

</template>
</Bilingual>

### 3.3. The Context Paradigm

<Bilingual>
<template #en>

Section 3.1 and Section 3.2 each act on a context, the first as the carrier of effects and the second as the carrier of coeffects, leaving open what a single context carrying both looks like. This section gives that unification a concrete construction, assembles from the coeffects an observational equivalence that supplies the effect independence Section 3.1.3 leaves open, and argues that the resulting context type constitutes a programming paradigm in its own right.

</template>
<template #zh>

第 3.1 节和第 3.2 节分别作用于上下文——前者作为效应的载体，后者作为协效应的载体——留下了同时携带两者的单一上下文是什么样子的问题。本节为该统一给出具体构造，从协效应组装出为第 3.1.3 节留下的效应独立性提供支持的观察等价性，并论证所得上下文类型本身就构成一种编程范式。

</template>
</Bilingual>

#### 3.3.1. Unified Context

<Bilingual>
<template #en>

**Definition 32.** The context type $\Gamma_\infty$ is defined as:

$$
\Gamma_\infty := \mu\Gamma . \, \Gamma \times (\Gamma \to \Gamma) \times \Sigma\tag{31}
$$

where the three projections are:
- $\Gamma$: the current context state (recursive);
- $\Gamma \to \Gamma$: the accumulator, which recovers this level's effects;
- $\Sigma$: the coeffect context carrying dependency information.

Under this definition, effect maps $\mathfrak{E}_{\Gamma_\infty}$ to itself, unifying the $\partial$-tower into a single self-similar type. The coeffect context $\Sigma$ is structurally integrated: dependency operations (set, get) act on $\Sigma$, and the accumulator tracks their reversal. Since the type family $\nu$ underlying $\Sigma$ is unconstrained, any state the system needs to share across components can be encoded as a dependency with an appropriate value type—$\Sigma$ subsumes all shared mutable states, not just inter-component dependencies. Every interaction between a component and its environment passes through this single entity.

</template>
<template #zh>

**定义 32.** 上下文类型 $\Gamma_\infty$ 定义为：

$$
\Gamma_\infty := \mu\Gamma . \, \Gamma \times (\Gamma \to \Gamma) \times \Sigma\tag{31}
$$

其中三个投影为：
- $\Gamma$：当前上下文状态（递归）；
- $\Gamma \to \Gamma$：累加器，恢复本层的效应；
- $\Sigma$：携带依赖信息的协效应上下文。

在此定义下，effect 将 $\mathfrak{E}_{\Gamma_\infty}$ 映射到自身，将 $\partial$-塔统一为单一的自相似类型。协效应上下文 $\Sigma$ 被结构性地整合：依赖操作（set、get）作用于 $\Sigma$，累加器跟踪其逆转。由于 $\Sigma$ 底层的类型族 $\nu$ 不受约束，系统需要在组件间共享的任何状态都可以编码为具有适当值类型的依赖——$\Sigma$ 涵盖了所有共享可变状态，而不仅是组件间依赖。组件与其环境之间的每次交互都通过这一单一实体进行。

</template>
</Bilingual>

#### 3.3.2. Observational Equivalence

<Bilingual>
<template #en>

The recovery guarantee of Section 3.1 asserts an equality of states (Theorem 7), which is an idealization, because the physical state cannot be recovered as it stood. For example, free releases a block to the allocator without restoring the layout the heap had before malloc; and a generative name is not restored by the inverse that discards it, since the next creation draws a fresh one [39]. The equalities of Section 3 are therefore to be read up to an equivalence $\simeq$, and we take $\simeq$ to be an observational equivalence: two states are related when no observer can distinguish them. What an observer of a context is given is the coeffects it carries, each of which arrives with an equivalence of its own (Definition 24), so the relation on a context is assembled from theirs.

</template>
<template #zh>

第 3.1 节的恢复保证断言状态的相等性（定理 7），这是一种理想化，因为物理状态无法原样恢复。例如，free 将块释放给分配器而不恢复 malloc 之前堆的布局；生成性名称不会被丢弃它的逆恢复，因为下一次创建会抽取一个新的 [39]。因此，第 3 节的等式应被读作在等价关系 $\simeq$ 下成立，我们将 $\simeq$ 取为观察等价性：当没有观察者能区分两个状态时，它们是相关的。上下文的观察者所获得的是其携带的协效应，每个协效应都带有自身的等价关系（定义 24），因此上下文上的关系由它们组装而成。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Theorem 40.** Operations at distinct keys are independent.

A key whose value is a table of entries added and removed independently is commutative, registration of a route or of an event listener being the representative case. A key whose value is an ordered chain is not, since a middleware inserted before another sees a different request, and neither order can be withdrawn without disturbing the other.

</template>
<template #zh>

**定理 40.** 不同键上的操作是独立的。

其值为独立添加和移除条目的表的键是可交换的，路由注册或事件监听器注册是代表性案例。其值为有序链的键不是可交换的，因为先于另一个插入的中间件会看到不同的请求，且任一顺序都不能在不干扰另一个的情况下撤销。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Theorem 42.** Let $e_1, e_2 \in \mathfrak{E}_\Sigma^\mathcal{A}$ and let every key at which operations of both occur be commutative (Definition 39). Then $e_1$ and $e_2$ are independent (Definition 19).

What the decomposition divides is a computation's commuting part from its order-sensitive part. The commuting part is carried by the effects: a component performs them in whatever order its task calls for, and Corollary 21 reverts them in whatever order the system finds convenient. The order-sensitive part is carried by the coeffects, since a key whose operations do not commute is one whose order has to be imposed from outside the effects. Composability is thereby had at the grain of components rather than of single effects, which is the scale Section 4 works at.

</template>
<template #zh>

**定理 42.** 设 $e_1, e_2 \in \mathfrak{E}_\Sigma^\mathcal{A}$，且两者操作同时出现的每个键都是可交换的（定义 39）。则 $e_1$ 和 $e_2$ 是独立的（定义 19）。

该分解划分的是计算的可交换部分和顺序敏感部分。可交换部分由效应承载：组件以其任务所需的任何顺序执行它们，推论 21 以系统方便的任何顺序撤销它们，两个组件互不约束。顺序敏感部分由协效应承载，因为操作不可交换的键是其顺序必须从效应外部施加的键。因此可组合性在组件粒度而非单一效应粒度上获得，这正是第 4 节工作的尺度。

</template>
</Bilingual>

#### 3.3.3. Situating the Context Paradigm

<Bilingual>
<template #en>

Programming paradigms differ fundamentally in how they handle side effects. Two established poles define the spectrum:

**Explicit state threading (functional).** To preserve referential transparency, purely functional languages model side effects as explicit transformations on state. The State monad $S \to (S, A)$ [23] threads an environment through every computation. This approach yields strong compositional guarantees: effects are visible in types and amenable to equational reasoning. However, it imposes significant ergonomic costs: every function in the call chain must accept and return the state parameter, even when it merely passes the state through unchanged.

**Implicit mutation (imperative/OOP).** Mainstream imperative languages permit components to modify shared state and access dependencies without explicit declaration at the call site. On the effect side, a representative example is React's `useEffect` hook: it registers a persistent side effect on the component's internal fiber, yet neither the effect target nor the registration mechanism appears as an explicit parameter. On the coeffect side, Java's service locator pattern retrieves dependencies from a process-wide registry at runtime, requiring null checks and type casts at each call site; dependency relationships are implicit and scattered across the codebase.

</template>
<template #zh>

编程范式在如何处理副作用方面有根本性不同。两个已确立的极端定义了这一谱系：

**显式状态穿线（函数式）。** 为保持引用透明性，纯函数式语言将副作用建模为状态上的显式变换。State 单子 $S \to (S, A)$ [23] 将环境穿线通过每个计算。这种方法产生强组合保证：效应在类型中可见，适于等式推理。然而，它带来了显著的人体工程学代价：调用链中的每个函数都必须接受和返回状态参数，即使它只是将状态原样传递。

**隐式变异（命令式/OOP）。** 主流命令式语言允许组件在调用点无需显式声明即可修改共享状态和访问依赖。在效应侧，代表性例子是 React 的 `useEffect` 钩子：它在组件内部 fiber 上注册持久副作用，但效应目标和注册机制都不作为显式参数出现。在协效应侧，Java 的服务定位器模式在运行时从进程级注册表中检索依赖，在每个调用点需要空检查和类型转换；依赖关系是隐式的，散布在代码库中。

</template>
</Bilingual>

<Bilingual>
<template #en>

The context paradigm combines the traceability of the functional approach with the ergonomics of the imperative approach. Effects and coeffects are both mediated through an explicit context parameter. Each operation is therefore attributable to the specific context on which it was invoked, and hence to the component that context belongs to.

Beyond combining the strengths of both poles, the context paradigm lets the developer handle each effect and dependency individually and composes them into the system's behavior automatically. For revertible effects, the developer supplies the inverse of each atomic operation, and the inverse of any composite follows by composition (Section 3.1), so a component's teardown is derived from its loading rather than written alongside it. For reactive coeffects, a component declares only the dependencies it needs, and the runtime resolves and re-wires them automatically (Section 3.2), keeping them consistently wired as providers are added, removed, or replaced. In both directions, correctness that would otherwise rest on developer discipline becomes a structural property of the paradigm.

</template>
<template #zh>

上下文范式将函数式方法的可追踪性与命令式方法的人体工程学结合起来。效应和协效应都通过显式的上下文参数中介。因此，每个操作都可归因于它被调用的特定上下文，进而归因于该上下文所属的组件。

除了结合两个极端的优势外，上下文范式让开发者单独处理每个效应和依赖，并自动将它们组合成系统行为。对于可逆效应，开发者提供每个原子操作的逆，任何复合的逆通过组合得到（第 3.1 节），因此组件的拆卸从其加载中推导而非与之并列编写。对于响应式协效应，组件仅声明其所需的依赖，运行时自动解析和重新连线（第 3.2 节），在提供者被添加、移除或替换时保持一致连线。在两个方向上，原本依赖开发者素养的正确性成为范式的结构性属性。

</template>
</Bilingual>

## 4. A Calculus of Dynamic Composition

<Bilingual>
<template #en>

Section 3 establishes spatial and temporal composability in their local form alone. Carrying them to a whole system takes a decomposition of the system into components, each pairing a coeffect specification with a witnessed effect function, so that every interaction with the shared environment is attributable to one of them. The sections below give that decomposition an operational semantics, and establishes spatial and temporal composability in their global form.

</template>
<template #zh>

第 3 节仅建立了空间和时间可组合性的局部形式。将其推广到整个系统需要将系统分解为组件，每个组件将协效应规格与带见证的效应函数配对，使得与共享环境的每次交互都可归因于某个组件。以下各节为该分解给出操作语义，并在全局形式上建立空间和时间可组合性。

</template>
</Bilingual>

### 4.1. Components and Fibers

<Bilingual>
<template #en>

This section fixes the objects the rules act on: the component; the fiber, an instantiation of a component carrying a lifecycle state of its own; and the registry, which holds the fibers a state carries and from which the coeffect context is read off.

**Definition 43.** A component over a context $\Gamma$ carrying both effects and coeffects (Definition 32) is defined as:

$$
\mathfrak{C}_\Gamma := \mathfrak{D}_\Gamma \times \mathfrak{P}_\Gamma \times \mathfrak{E}_\Gamma^*\tag{37}
$$

representing a triple $(d, p, e)$, where:
- $d: \mathfrak{D}_\Gamma$ is the coeffect specification, declaring the dependencies required from the environment;
- $p: \mathfrak{P}_\Gamma := \mathsf{Set}(K)$ is the provision, declaring the coeffect keys the component may provide;
- $e: \mathfrak{E}_\Gamma^*$ is the witnessed effect function, defining the effects contributed when the component is active together with the inverse that withdraws them.

</template>
<template #zh>

本节固定规则所作用的对象：组件；fiber（纤维），即携带自身生命周期状态的组件实例化；以及注册表，它持有状态携带的 fiber，协效应上下文从中读出。

**定义 43.** 在同时携带效应和协效应的上下文 $\Gamma$（定义 32）上的组件定义为：

$$
\mathfrak{C}_\Gamma := \mathfrak{D}_\Gamma \times \mathfrak{P}_\Gamma \times \mathfrak{E}_\Gamma^*\tag{37}
$$

表示三元组 $(d, p, e)$，其中：
- $d: \mathfrak{D}_\Gamma$ 是协效应规格，声明从环境所需的依赖；
- $p: \mathfrak{P}_\Gamma := \mathsf{Set}(K)$ 是提供声明，声明组件可能提供的协效应键；
- $e: \mathfrak{E}_\Gamma^*$ 是带见证效应函数，定义组件活跃时贡献的效应及撤销它们的逆。

</template>
</Bilingual>

<Bilingual>
<template #en>

A component instantiated in a running system is activated and deactivated over time, so it carries a lifecycle state, and a transition is what moves it from one lifecycle state to another: an activation executes $e$, accumulating side effects on the context, and a deactivation applies the accumulator to recover the context. In its simplest form the lifecycle is the two-state model of Figure 1, which Section 4.2 gives rules for; Section 4.3 refines it as each control-flow feature is admitted.

</template>
<template #zh>

在运行系统中实例化的组件随时间被激活和去激活，因此它携带生命周期状态，转换将其从一个生命周期状态移到另一个：激活执行 $e$，在上下文上积累副作用，去激活应用累加器恢复上下文。在其最简形式中，生命周期是图 1 的两状态模型，第 4.2 节为其给出规则；第 4.3 节随着每个控制流特性的引入对其进行精化。

</template>
</Bilingual>

![图 1 | 基础组件生命周期](<A Programming Paradigm for Spatiotemporal Composability/image-3.jpg>)

<Bilingual>
<template #en>

**Fibers.** One component may be instantiated many times over, each instantiation carrying a lifecycle state of its own. We name such an instantiation a **fiber**. A fiber records the component that produced it, the fiber it was instantiated under, the coeffects it provides, and where in its lifecycle it stands.

**Definition 44.** A fiber instantiating the component $(d, p, e) \in \mathfrak{C}_\Gamma$ is a tuple $\langle d, p, e, \pi, \sigma, \tau, \theta\rangle$, where $\pi$ is the parent fiber, $\sigma$ is the fiber's own coeffect table, $\tau$ is the retirement flag, and $\theta$ is the lifecycle state.

**Registry.** A state holds its fibers under their names. Each fiber owning a table means the coeffect context is derived rather than stored: it is what the active fibers jointly provide.

$$
\sigma_\gamma := \bigcup \left\{\sigma_m \mid m \in \mathrm{dom}(F_\gamma), \theta_m = \text{Active}(-, -)\right\}\tag{40}
$$

</template>
<template #zh>

**Fiber（纤维）。** 一个组件可以被多次实例化，每次实例化携带自身的生命周期状态。我们将这样的实例化称为 **fiber**。fiber 记录产生它的组件、它在其下被实例化的 fiber、它提供的协效应，以及它在生命周期中所处的位置。

**定义 44.** 实例化组件 $(d, p, e) \in \mathfrak{C}_\Gamma$ 的 fiber 是元组 $\langle d, p, e, \pi, \sigma, \tau, \theta\rangle$，其中 $\pi$ 是父 fiber，$\sigma$ 是 fiber 自身的协效应表，$\tau$ 是退役标志，$\theta$ 是生命周期状态。

**注册表。** 状态以名称持有其 fiber。每个 fiber 拥有自己的表意味着协效应上下文是导出的而非存储的：它是活跃 fiber 联合提供的。

$$
\sigma_\gamma := \bigcup \left\{\sigma_m \mid m \in \mathrm{dom}(F_\gamma), \theta_m = \text{Active}(-, -)\right\}\tag{40}
$$

</template>
</Bilingual>

### 4.2. The Base Calculus

<Bilingual>
<template #en>

This section gives the calculus of the two-state lifecycle of Figure 1 and nothing more: the target each fiber is compared against, and the five rules that move it.

**Target views.** The rules compare each fiber against a target, namely whether it ought to be running and against which resolution of its dependencies.

**Definition 46.** The target view of $n$ at $\gamma$ maps each declared key to its provider, so it is a total map $d_n \to \mathfrak{N}$, and is $\bot$ when $n$ ought not to be running at all:

$$
\mathrm{target}_n(\gamma) := \left\{\begin{array}{ll}\bot & \text{if } \tau_n \lor \neg(\gamma \vDash d_n) \\(k \in d_n) \mapsto \mathrm{provider}_k(\gamma) & \text{otherwise}\end{array}\right.\tag{41}
$$

**Rules.** The base calculus takes each transition to be atomic, immediate, and infallible. Five rules generate two relations: an **orchestration rule** (O-prefixed) is an action the orchestrator may perform; a **lifecycle rule** (L-prefixed) is a step the system takes unprompted whenever its premises hold.

</template>
<template #zh>

本节给出图 1 两状态生命周期的演算，仅此而已：每个 fiber 被比较的目标，以及移动它的五条规则。

**目标视图。** 规则将每个 fiber 与目标比较，即它是否应该运行以及依赖的哪种解析。

**定义 46.** $n$ 在 $\gamma$ 处的目标视图将每个声明的键映射到其提供者，因此它是全映射 $d_n \to \mathfrak{N}$，当 $n$ 不应该运行时为 $\bot$：

$$
\mathrm{target}_n(\gamma) := \left\{\begin{array}{ll}\bot & \text{若 } \tau_n \lor \neg(\gamma \vDash d_n) \\(k \in d_n) \mapsto \mathrm{provider}_k(\gamma) & \text{否则}\end{array}\right.\tag{41}
$$

**规则。** 基础演算将每个转换视为原子的、即时的和不会失败的。五条规则生成两种关系：**编排规则**（O 前缀）是编排者可能执行的动作；**生命周期规则**（L 前缀）是系统在前提满足时主动采取的步骤。

</template>
</Bilingual>

<Bilingual>
<template #en>

- **O-Insert:** the orchestrator inserts a fiber into the registry (subject to provision disjointness);
- **O-Retire:** the orchestrator marks a fiber for removal;
- **O-Remove:** a retired, inactive fiber with no children is removed from the registry;
- **L-Reload:** an inactive fiber whose dependencies are satisfied activates, executing its effect function;
- **L-Unload:** an active fiber whose target view no longer matches its committed view deactivates, applying the accumulator.

**Instantiation.** A component may instantiate another while installing its effects, which is what a plugin host does when a plugin loads plugins of its own. The registration primitive (Definition 47) allows an effect function to register a component, with O-Insert as its forward action and O-Retire as its inverse.

**Confinement.** An effect function is confined to its fiber: it writes only the fiber's own table and control fields, and reads only the coeffects it declared. This is what lets the metatheory read the rules as a complete inventory of writes.

</template>
<template #zh>

- **O-Insert：** 编排者将 fiber 插入注册表（需满足提供不相交性）；
- **O-Retire：** 编排者标记 fiber 以待移除；
- **O-Remove：** 已退役、非活跃且无子 fiber 的 fiber 从注册表中移除；
- **L-Reload：** 依赖已满足的非活跃 fiber 激活，执行其效应函数；
- **L-Unload：** 目标视图不再匹配提交视图的活跃 fiber 去激活，应用累加器。

**实例化。** 组件可以在安装效应时实例化另一个组件，这正是插件宿主在插件加载自己的插件时所做的。注册原语（定义 47）允许效应函数注册组件，以 O-Insert 作为前向动作，O-Retire 作为逆。

**限制。** 效应函数被限制在其 fiber：它只写该 fiber 自身的表和控制字段，只读其声明的协效应。这使得元理论可以将规则视为写的完整清单。

</template>
</Bilingual>

### 4.3. Transitions in Progress

<Bilingual>
<template #en>

This section extends the base calculus in four settings. The first supplies something Section 3.2 requires and Section 4.2 cannot express, a deactivation spread over an interval its dependents may occupy; the other three drop the idealization that a transition is atomic, immediate, and infallible. The four share one structural consequence: a transition that is not a step needs a state to occupy while it is under way, one for each direction it may run in.

**Definition 49.** The lifecycle states replace $\Theta_\Gamma$ by

$$
\Theta_\Gamma := \text{Inactive}(\zeta) \mid \text{Reloading}(i, g, \omega) \mid \text{Active}(g, \omega) \mid \text{Unloading}(g, \omega, \zeta)\tag{43}
$$

where $i$ is the remaining effect iterator, $g$ the accumulator built so far, $\omega$ the committed view, and $\zeta$ the outcome.

</template>
<template #zh>

本节在四个设定下扩展基础演算。第一个提供了第 3.2 节要求而第 4.2 节无法表达的东西——一个延续在一段区间上的去激活，其依赖者可以占据该区间；另外三个放弃转换是原子的、即时的和不会失败的理想化。四者共享一个结构后果：不是一步的转换需要一个在途状态来占据，每个方向各一个。

**定义 49.** 生命周期状态将 $\Theta_\Gamma$ 替换为

$$
\Theta_\Gamma := \text{Inactive}(\zeta) \mid \text{Reloading}(i, g, \omega) \mid \text{Active}(g, \omega) \mid \text{Unloading}(g, \omega, \zeta)\tag{43}
$$

其中 $i$ 是剩余效应迭代器，$g$ 是目前已构建的累加器，$\omega$ 是提交视图，$\zeta$ 是结果。

</template>
</Bilingual>

![图 2 | 进行中的转换的生命周期；两个转换状态以轮廓标出](<A Programming Paradigm for Spatiotemporal Composability/image-4.jpg>)

#### 4.3.1. Withdrawal

<Bilingual>
<template #en>

Section 3.2 requires that dependents activate after their dependencies and that dependencies withdraw their provisions only after their dependents have deactivated. The second half must deliver that a consumer can still read $k$ throughout its own deactivation, and that the provider's withdrawal of $k$ takes effect only afterwards. The base calculus cannot deliver it: its L-Unload removes the provisions and runs the inverse together, leaving no interval between them for a consumer's teardown to occupy.

This layer splits that step in two. **L-Leave** records the decision to deactivate without acting on it, which stops the fiber providing its coeffects while leaving its committed view intact. **L-Unload** applies the accumulator only when no other installed fiber relies on this one (the **guard**). What keeps the guard from deadlocking is that once L-Leave has marked $n$, its table leaves $\sigma_\gamma$, so no target view can name $n$ any longer, and every consumer that committed to $n$ is itself on its way out.

</template>
<template #zh>

第 3.2 节要求依赖者在其依赖之后激活，且依赖仅在依赖者去激活后才撤回其提供。后半部分必须交付的是：消费者在自身去激活过程中仍能读取 $k$，且提供者对 $k$ 的撤回仅在此之后生效。基础演算无法交付这一点：其 L-Unload 同时移除提供并运行逆，两者之间没有消费者拆卸可以占据的区间。

本层将该步骤一分为二。**L-Leave** 记录去激活的决定但不执行它，这使 fiber 停止提供协效应同时保持其提交视图不变。**L-Unload** 仅在没有其他已安装 fiber 依赖此 fiber 时（**守卫**）才应用累加器。使守卫不死锁的是：一旦 L-Leave 标记了 $n$，其表离开 $\sigma_\gamma$，因此没有目标视图能再命名 $n$，每个提交到 $n$ 的消费者自身也在退出中。

</template>
</Bilingual>

#### 4.3.2. Iteration

<Bilingual>
<template #en>

An activation may execute multiple effects in sequence, and the deactivation must recover them. We model such an activation with an **effect iterator**, each of whose iterations yields the modified context, an inverse, and a continuation. At each iteration, the inverse is composed onto the accumulator in application order, so the accumulator naturally recovers effects in LIFO order when applied. In the calculus, this splits the base L-Reload into a begun state (Reloading) that the trace passes through, with rules L-Begin, L-Iter, L-Finish, and L-Divert. Between any two consecutive iterations the system may divert the transition if its target view has changed, applying the inverse accumulated so far to recover the context.

</template>
<template #zh>

激活可能顺序执行多个效应，去激活必须恢复它们。我们用**效应迭代器**建模这样的激活，每次迭代产生修改后的上下文、一个逆和一个续延。每次迭代中，逆按应用顺序复合到累加器上，因此累加器在应用时自然以 LIFO 顺序恢复效应。在演算中，这将基础 L-Reload 分裂为迹经过的开始状态（Reloading），带有规则 L-Begin、L-Iter、L-Finish 和 L-Divert。在任意两次连续迭代之间，如果目标视图已变化，系统可以转移转换，应用迄今为止积累的逆来恢复上下文。

</template>
</Bilingual>

#### 4.3.3. Asynchrony

<Bilingual>
<template #en>

The layers so far let the environment move between one iteration and the next, and assume that each iteration itself completes instantaneously. We model non-immediacy abstractly: an iteration yields a value of type `Pending(A)`, where `Pending` is an opaque type constructor whose defining property is that between submission and resolution, external state may change. Under this model an iteration is launched at one state and lands at another, and the fiber is Reloading while it is in flight. What the layer adds is **inertia**: once launched, an iteration lands, and its landing cannot be declined.

</template>
<template #zh>

到目前为止的层允许环境在两次迭代之间移动，并假设每次迭代本身即时完成。我们抽象地建模非即时性：迭代产生类型为 `Pending(A)` 的值，其中 `Pending` 是不透明类型构造子，其定义性质是在提交和解决之间，外部状态可能变化。在此模型下，迭代在一个状态启动并在另一个状态着陆，fiber 在飞行中处于 Reloading 状态。本层添加的是**惯性**：一旦启动，迭代就会着陆，其着陆不可拒绝。

</template>
</Bilingual>

#### 4.3.4. Failure

<Bilingual>
<template #en>

Every rule so far assumes the effect it runs succeeds, and a runtime cannot. The effects a component installs reach outside the context that tracks them, and what they reach may refuse: a port already bound, a file that is not there, a peer that does not answer. A failing transition must still leave the fiber's effects recovered rather than stranded. **L-Raise** routes a failure through Unloading like every other deactivation, carrying the error as its outcome. The accumulator built up to the failing iteration is applied there, and the fiber arrives at Inactive($\xi$) having installed nothing. A failure is recorded on the fiber rather than propagated to its parent, so a component whose transition fails leaves its siblings running.

</template>
<template #zh>

到目前为止的每条规则都假设其运行的效应成功，但运行时无法保证。组件安装的效应到达跟踪它们的上下文之外，而那些到达之处可能拒绝：端口已被绑定、文件不存在、对端不响应。失败的转换仍必须恢复 fiber 的效应而非使其搁浅。**L-Raise** 像其他所有去激活一样通过 Unloading 路由失败，携带错误作为结果。到失败迭代为止构建的累加器在此应用，fiber 到达 Inactive($\xi$) 而未安装任何东西。失败记录在 fiber 上而非传播到其父 fiber，因此转换失败的组件使其兄弟继续运行。

</template>
</Bilingual>

### 4.4. Metatheory

<Bilingual>
<template #en>

This section reads the two dimensions of composability of the rules in their global form, one fiber's guarantee holding whatever the other fibers do in between, and adds what only a whole system can be asked for: that it always reaches the configuration its targets call for, and that the configuration is the one a static assembly would have produced.

</template>
<template #zh>

本节以全局形式读取规则的两个可组合性维度——一个 fiber 的保证在其他 fiber 之间的任何行为下都成立——并添加只有整个系统才能被要求的东西：它总是到达其目标所要求的配置，且该配置是静态组装所会产生的。

</template>
</Bilingual>

#### 4.4.1. Preservation

<Bilingual>
<template #en>

**Definition 58.** A registry $F_\gamma$ is well formed when, for all $m, n \in \mathrm{dom}(F_\gamma)$ and all $k \in K$:
1. $\pi_n \in \mathrm{dom}(F_\gamma) \cup \{\text{root}\}$ (parent pointers land in the registry);
2. $m \neq n \Rightarrow p_m \cap p_n = \emptyset$ (provisions are disjoint);
3. $\mathrm{installed}_n(\gamma) \Rightarrow \omega_n$ is total on $d_n$ and valued in $\mathrm{dom}(F_\gamma)$ (committed views point to installed providers);
4. $\mathrm{installed}_n(\gamma) \land k \in d_n \land \omega_n(k) = m \Rightarrow \mathrm{installed}_m(\gamma)$ (dependencies are installed).

**Theorem 59 (Preservation).** If $F^t$ is well formed then so is $F^{t+1}$, whichever rule step $t$ applies.

</template>
<template #zh>

**定义 58.** 注册表 $F_\gamma$ 是良构的，当对所有 $m, n \in \mathrm{dom}(F_\gamma)$ 和所有 $k \in K$：
1. $\pi_n \in \mathrm{dom}(F_\gamma) \cup \{\text{root}\}$（父指针落在注册表中）；
2. $m \neq n \Rightarrow p_m \cap p_n = \emptyset$（提供不相交）；
3. $\mathrm{installed}_n(\gamma) \Rightarrow \omega_n$ 在 $d_n$ 上完全且取值于 $\mathrm{dom}(F_\gamma)$（提交视图指向已安装的提供者）；
4. $\mathrm{installed}_n(\gamma) \land k \in d_n \land \omega_n(k) = m \Rightarrow \mathrm{installed}_m(\gamma)$（依赖已安装）。

**定理 59（保持性）。** 若 $F^t$ 良构，则 $F^{t+1}$ 也良构，无论步骤 $t$ 应用哪条规则。

</template>
</Bilingual>

#### 4.4.2. Temporal Composability

<Bilingual>
<template #en>

**Theorem 61 (Recovery exactness).** Let the sequence of steps be pairwise independent, let an episode of $n$ open at $b$, and let $t_1 < \dots < t_l$ be the indices in $[b, u)$ at which the acting fiber is not $n$. Then

$$
g_n^u(\gamma^u) \approx (\Psi^{t_l} \circ \dots \circ \Psi^{t_1})(\gamma^b)\tag{56}
$$

That is, applying $n$'s accumulator at $\gamma^u$ yields, up to the control fields, the state those same steps would have produced from $\gamma^b$.

**Corollary 62 (Terminal recovery).** When the episode closes at $u$, whatever outcome $\zeta$ it arrives at:

$$
\gamma^{u+1} \approx (\Psi^{t_l} \circ \dots \circ \Psi^{t_1})(\gamma^b)\tag{57}
$$

A fiber removed by O-Remove leaves nothing behind either.

</template>
<template #zh>

**定理 61（恢复精确性）。** 设步骤序列两两独立，$n$ 的一个 episode 在 $b$ 开启，$t_1 < \dots < t_l$ 为 $[b, u)$ 中作用 fiber 不是 $n$ 的索引。则

$$
g_n^u(\gamma^u) \approx (\Psi^{t_l} \circ \dots \circ \Psi^{t_1})(\gamma^b)\tag{56}
$$

即在 $\gamma^u$ 处应用 $n$ 的累加器，在控制字段之外，产生这些相同步骤从 $\gamma^b$ 本会产生的状态。

**推论 62（终端恢复）。** 当 episode 在 $u$ 关闭时，无论到达什么结果 $\zeta$：

$$
\gamma^{u+1} \approx (\Psi^{t_l} \circ \dots \circ \Psi^{t_1})(\gamma^b)\tag{57}
$$

被 O-Remove 移除的 fiber 也不留下任何东西。

</template>
</Bilingual>

#### 4.4.3. Spatial Composability

<Bilingual>
<template #en>

**Theorem 63 (Ordering).** A fiber begins a transition only where its dependencies are provided. Let $[b', u']$ be an episode of $m$ with $\omega_m^{b'}(k) = n$ for some $m \neq n$ and $k \in d_m$, and let $[b, u]$ be the episode of $n$ containing $b'$. Then:
1. $\omega_m^t(k) = n$ throughout $[b', u']$;
2. $b < b'$, and $u' < u$ if $[b, u]$ closes (the provider outlives the consumer);
3. $k \in \mathrm{dom}(\sigma_n^t)$ and $\sigma_n^t(k) = \sigma_n^{b'}(k)$ (the binding is stable).

**Theorem 64 (Resolution coherence).** Let an episode $[b, u]$ of $n$ open at $b$ with $\omega_n^b = \omega$. Then $\theta_n$ is Reloading on an initial interval $[b, r]$ of the episode, and every iteration of the transition runs against the one resolution $\omega$. Where the fiber leaves that interval, either it finishes into Active, or it diverts/raises into Unloading and recovers via Corollary 62.

</template>
<template #zh>

**定理 63（排序）。** fiber 仅在其依赖被提供时才开始转换。设 $[b', u']$ 为 $m$ 的一个 episode，$\omega_m^{b'}(k) = n$（某 $m \neq n$，$k \in d_m$），$[b, u]$ 为包含 $b'$ 的 $n$ 的 episode。则：
1. 在 $[b', u']$ 全程 $\omega_m^t(k) = n$；
2. $b < b'$，且若 $[b, u]$ 关闭则 $u' < u$（提供者比消费者长寿）；
3. $k \in \mathrm{dom}(\sigma_n^t)$ 且 $\sigma_n^t(k) = \sigma_n^{b'}(k)$（绑定稳定）。

**定理 64（解析一致性）。** 设 $n$ 的 episode $[b, u]$ 在 $b$ 开启，$\omega_n^b = \omega$。则 $\theta_n$ 在 episode 的初始区间 $[b, r]$ 上为 Reloading，转换的每次迭代都针对同一解析 $\omega$ 运行。fiber 离开该区间时，要么完成进入 Active，要么转移/抛出进入 Unloading 并通过推论 62 恢复。

</template>
</Bilingual>

#### 4.4.4. Progress

<Bilingual>
<template #en>

**Theorem 66 (Progress).** Assume $\prec$ acyclic, $\mathrm{len}(e_n) \leq K$ for every $n$, and the set $N$ of names finite. Then:
1. **(No deadlock)** $\neg\mathrm{quiet}^t$ implies that some lifecycle rule applies at $\gamma^t$;
2. **(Termination)** $S(n) \leq (K+4)(V(n)+1)$, and both $V(n)$ and $\sum_n S(n)$ are finite. Consequently every maximal sequence of lifecycle steps ends in a quiescent state.

The guard on L-Unload is what carries the no-deadlock argument: a chain of fibers each waiting on the next is $\prec$-increasing, hence distinct by acyclicity, and the registry is finite, so the chain stops.

</template>
<template #zh>

**定理 66（进展性）。** 假设 $\prec$ 无环，每个 $n$ 的 $\mathrm{len}(e_n) \leq K$，名称集合 $N$ 有限。则：
1. **（无死锁）** $\neg\mathrm{quiet}^t$ 蕴含某个生命周期规则在 $\gamma^t$ 处适用；
2. **（终止性）** $S(n) \leq (K+4)(V(n)+1)$，且 $V(n)$ 和 $\sum_n S(n)$ 都有限。因此每个极大的生命周期步骤序列终结于静止状态。

L-Unload 上的守卫承载了无死锁论证：一条每个 fiber 等待下一个的 fiber 链是 $\prec$-递增的，因此由无环性各异，注册表有限，故链停止。

</template>
</Bilingual>

#### 4.4.5. Confluence

<Bilingual>
<template #en>

The property that characterizes the system as a whole is that its dynamic history leaves no trace: whatever sequence of activations and deactivations a running system has been through, the state it quiesces at is the one the same insertions and retirements would have produced had each component that ends up active been loaded once, in dependency order, and none ever unloaded. The lifecycle relation is confluent, and the normal form it converges on is the statically assembled one.

**Theorem 73 (Confluence).** Let a sequence of steps reach a quiescent $\gamma^T$ at which no fiber is failed, let the steps be pairwise independent and every component be total on its provision, and let $A$ be the support set. Then:
1. **(Canonical form)** $\gamma^T$ is reached, up to names, by a sequence taking the same orchestration steps in original order and one episode of each fiber of $A$ in dependency order;
2. **(Confluence)** Any two such sequences reach states related by $\simeq$ and $\approx$ (after renaming).

The theorem is what licenses reasoning about a Cordis application as though it were statically assembled. An orchestrator that adds a component, removes it, replaces a provider, and reverts the replacement is guaranteed to arrive at the state it would have obtained by writing the final composition down at the outset.

</template>
<template #zh>

刻画整个系统的性质是其动态历史不留痕迹：无论运行系统经历了什么激活和去激活序列，它静止于的状态，与相同插入和退役在依赖顺序下每个最终活跃的组件各加载一次、从不卸载所会产生的状态相同。生命周期关系是汇合的，其收敛到的范式是静态组装的。

**定理 73（汇合性）。** 设步骤序列到达静止的 $\gamma^T$，无 fiber 失败，步骤两两独立且每个组件在其提供上完全，$A$ 为支撑集。则：
1. **（规范形）** $\gamma^T$（在名称之外）可通过以原始顺序取相同编排步骤、按依赖顺序取 $A$ 中每个 fiber 一个 episode 的序列到达；
2. **（汇合性）** 任意两个这样的序列到达的状态经重命名后由 $\simeq$ 和 $\approx$ 关联。

该定理授权将 Cordis 应用当作静态组装的来进行推理。编排者添加组件、移除它、替换提供者、再回退替换，保证到达在最初写下最终组合时所会获得的状态。

</template>
</Bilingual>

## 5. Implementation and Case Study

<Bilingual>
<template #en>

This section presents Cordis, which realizes the formal models of Section 3 as a practical programming abstraction. Cordis is a meta-framework of spatiotemporal composability: unlike application frameworks that target a specific domain (e.g., web routing, ORM, UI rendering), it prescribes no concrete scenario; its sole responsibility is to supply universal dynamic composition semantics. The implementation is layered into three tiers: (1) the core library (Section 5.1) implements the effect and coeffect systems directly; (2) the component loader (Section 5.2) extends the core with configuration reconciliation and hot module replacement; and (3) application frameworks such as Koishi (Section 5.3) build domain-specific functionality on top of the former two tiers.

</template>
<template #zh>

本节介绍 Cordis，它将第 3 节的形式模型实现为实用的编程抽象。Cordis 是时空可组合性的元框架：与针对特定领域（如 Web 路由、ORM、UI 渲染）的应用框架不同，它不规定具体场景；其唯一职责是提供通用的动态组合语义。实现分三层：(1) 核心库（第 5.1 节）直接实现效应和协效应系统；(2) 组件加载器（第 5.2 节）以配置协调和热模块替换扩展核心；(3) 应用框架如 Koishi（第 5.3 节）在前两层之上构建领域特定功能。

</template>
</Bilingual>

### 5.1. Core Library

<Bilingual>
<template #en>

Table 2 summarizes the correspondence between theoretical constructs and their runtime counterparts. We use the runtime names introduced below throughout this section, reserving the theoretical symbols for the formal correspondence. We also write `@@name` for a framework-internal symbol key, so the brackets in `ctx[@@store]` denote symbol-keyed access to an opaque slot on the context, rather than indexing into a string-keyed map.

The remainder of this section builds the core library from the bottom up. Section 5.1.1 realizes revertible effects, the sole primitive through which a context is mutated; Section 5.1.2 realizes reactive coeffects over it; Section 5.1.3 composes both into the component lifecycle; and Section 5.1.4 exposes the context-level operations built on them.

</template>
<template #zh>

表 2 总结了理论构造与运行时对应物之间的映射。本节通篇使用下面引入的运行时名称，保留理论符号用于形式对应。我们也写 `@@name` 表示框架内部符号键，因此 `ctx[@@store]` 中的方括号表示对上下文上不透明槽位的符号键访问，而非对字符串键映射的索引。

本节余下部分自底向上构建核心库。第 5.1.1 节实现可逆效应，即上下文被修改的唯一原语；第 5.1.2 节在其上实现反应式协效应；第 5.1.3 节将两者组合为组件生命周期；第 5.1.4 节暴露在其上构建的上下文级操作。

</template>
</Bilingual>

#### 5.1.1. Effect Tracking

<Bilingual>
<template #en>

This section realizes revertible effects (Section 3.1). Every context mutation in Cordis flows through a single primitive, `ctx.effect`: coeffect provision, component instantiation, and every other context-mutating operation reduces to a `ctx.effect` call, so any operation performed through the context is automatically tracked and recovered upon component unloading. Operationally, `ctx.effect` is the realization of `effect_iter` (Definition 52): it takes a callback of type $\mathfrak{E}_\Gamma^{\mathrm{iter}}$ and lifts it to $\mathfrak{E}_{\partial\Gamma}^{\mathrm{iter}}$, yielding a dispose closure that, when invoked, recovers the effect. Cordis accepts both $\mathfrak{E}_\Gamma$ and $\mathfrak{E}_\Gamma^{\mathrm{iter}}$ through this one operation (ad-hoc polymorphism); we take the iterator form as representative, since a plain effect function is the degenerate iterator that yields a single inverse. What the operation does not check is the witness that $\mathfrak{E}_\Gamma^*$ carries: the callback supplies an inverse, and that the inverse recovers the effect it accompanies is an obligation on the component author rather than a property the runtime verifies. Theorem 61 is where the calculus appeals to it, and Section 6.1 is where the obligation is delimited.

Algorithm 1 shows the construction of `ctx.effect`. We write $f \circ g$ for the disposer that runs $f$ after $g$, and `id` for the no-op; prepending each new inverse therefore yields LIFO recovery.

</template>
<template #zh>

本节实现可逆效应（第 3.1 节）。Cordis 中的每次上下文修改都流经唯一原语 `ctx.effect`：协效应提供、组件实例化以及所有其他修改上下文的操作都归约为 `ctx.effect` 调用，因此通过上下文执行的任何操作都会在组件卸载时自动被跟踪和恢复。操作上，`ctx.effect` 是 `effect_iter`（定义 52）的实现：它接受类型为 $\mathfrak{E}_\Gamma^{\mathrm{iter}}$ 的回调并将其提升为 $\mathfrak{E}_{\partial\Gamma}^{\mathrm{iter}}$，产生一个 dispose 闭包，调用时恢复效应。Cordis 通过这一操作同时接受 $\mathfrak{E}_\Gamma$ 和 $\mathfrak{E}_\Gamma^{\mathrm{iter}}$（特设多态）；我们以迭代器形式为代表，因为普通效应函数是产生单个逆的退化迭代器。该操作不检查的是 $\mathfrak{E}_\Gamma^*$ 携带的见证：回调提供逆，而逆恢复其所伴随的效应是组件作者的义务而非运行时验证的属性。定理 61 是演算引用它的地方，第 6.1 节是该义务被界定的地方。

算法 1 展示了 `ctx.effect` 的构造。我们写 $f \circ g$ 表示在 $g$ 之后运行 $f$ 的 disposer，`id` 表示空操作；因此前插每个新逆产生 LIFO 恢复。

</template>
</Bilingual>

```
Algorithm 1  Effect tracking
 1  async function execute(callback, guard)
 2    iter ← callback()
 3    inverse ← id
 4    while guard()
 5      (value, done) ← await iter.next()
 6      if value then inverse ← value ○ inverse
 7      if done then break
 8    return inverse
 9  function effect(ctx, callback)
10    armed ← true
11    task ← execute(callback, () → armed)
12    async function dispose()
13      if not armed then return
14      armed ← false
15      recover ← await task
16      recover()
17    ctx.dispose ← dispose ○ ctx.dispose
18    return dispose
```

<Bilingual>
<template #en>

The engine `execute` drives the callback as an effect iterator ($\mathfrak{E}_\Gamma^{\mathrm{iter}}$, Definition 51) and folds the inverse yielded at each step into a single composite. Before each step it consults a caller-supplied guard; once the guard trips, iteration stops and only the inverses accumulated so far remain. This is the step-boundary interruption of Section 4.3.2: the ($\mathfrak{E}^{\mathrm{iter}}$) continuation is realized by the iterator's done flag together with guard.

`ctx.effect` is a thin wrapper over `execute` that adds two things. First, self-disposal: the guard reports the armed flag, and the returned dispose flips armed to false, which simultaneously halts any in-flight iteration and makes recovery fire at most once. Firing twice would apply an inverse at a state no application of the effect produced, where nothing holds it to reverting anything. Second, parent composition: dispose is prepended to the enclosing context's accumulated inverse `ctx.dispose`, so a child effect's inverse is itself an effect on the parent, which is the recursive structure of $\partial^2\Gamma$. The component level (Section 5.1.3) reuses the same `execute` with a guard that tests the stability of `fiber.target` instead of armed.

</template>
<template #zh>

引擎 `execute` 将回调作为效应迭代器（$\mathfrak{E}_\Gamma^{\mathrm{iter}}$，定义 51）驱动，将每步产生的逆折叠为单个复合。每步之前它查询调用者提供的守卫；一旦守卫触发，迭代停止，仅保留迄今为止积累的逆。这是第 4.3.2 节的步骤边界中断：($\mathfrak{E}^{\mathrm{iter}}$) 续延由迭代器的 done 标志连同守卫实现。

`ctx.effect` 是 `execute` 的薄包装，添加了两样东西。第一，自处置：守卫报告 armed 标志，返回的 dispose 将 armed 翻转为 false，同时停止任何飞行中的迭代并使恢复最多触发一次。触发两次会在没有任何效应应用产生的状态上应用逆，没有东西约束它恢复任何东西。第二，父复合：dispose 被前插到外围上下文积累的逆 `ctx.dispose`，因此子效应的逆本身是父上的效应，这正是 $\partial^2\Gamma$ 的递归结构。组件级（第 5.1.3 节）复用相同的 `execute`，守卫测试 `fiber.target` 的稳定性而非 armed。

</template>
</Bilingual>

#### 5.1.2. Coeffect Operations

<Bilingual>
<template #en>

This section realizes reactive coeffects (Section 3.2). All coeffect operations act on three symbol-keyed slots that each context carries:

- `@@store`: the value store $\sigma : (r : R) \mathcal{V}_r$ from realm symbols to typed values;
- `@@isolate`: the realm table $\rho : \mathrm{Map}(K, R)$ from coeffect keys to realm symbols;
- `@@intercept`: the interception table $\iota : (k : K) \to \mathcal{M}_k$ assigning each key its metadata.

The first two compose into the two-layer resolution $k \to \rho(k) \to \sigma(\rho(k))$: `ctx.get(key)` (Algorithm 2) reads the realm symbol $\rho(k)$ from `@@isolate`, then the bound value $\sigma(\rho(k))$ from `@@store`. The $\rho$ indirection lets isolation redirect a key to an independent binding, whereas `@@intercept` is consulted only when a binding is accessed, adjusting how it is used rather than what it resolves to. We realize these operations in two parts: (1) provision and notification, which install or retract bindings and propagate the change to dependents; and (2) isolation and interception, which reshape how a key resolves.

**Provision and notification.** Since `set(k, v)` has type $\mathfrak{E}_\Sigma$ (Section 3.1), coeffect provision is a `ctx.effect` call and inherits its automatic tracking and recovery. Algorithm 2 implements `ctx.set(key, value)`, the concrete `set(k, v)`: the callback binds a value into the store under the realm symbol $\rho(k)$, and the returned dispose function removes it. Both installation and removal invoke `notify` to propagate the change to dependent components.

</template>
<template #zh>

本节实现反应式协效应（第 3.2 节）。所有协效应操作作用于每个上下文携带的三个符号键槽位：

- `@@store`：值存储 $\sigma : (r : R) \mathcal{V}_r$，从领域符号到类型化值；
- `@@isolate`：领域表 $\rho : \mathrm{Map}(K, R)$，从协效应键到领域符号；
- `@@intercept`：拦截表 $\iota : (k : K) \to \mathcal{M}_k$，为每个键分配其元数据。

前两者组合成两层解析 $k \to \rho(k) \to \sigma(\rho(k))$：`ctx.get(key)`（算法 2）从 `@@isolate` 读取领域符号 $\rho(k)$，再从 `@@store` 读取绑定值 $\sigma(\rho(k))$。$\rho$ 间接层让隔离将键重定向到独立绑定，而 `@@intercept` 仅在访问绑定时查询，调整的是它的使用方式而非解析到什么。我们分两部分实现这些操作：(1) 提供和通知，安装或撤回绑定并将变更传播给依赖者；(2) 隔离和拦截，重塑键的解析方式。

**提供和通知。** 由于 `set(k, v)` 类型为 $\mathfrak{E}_\Sigma$（第 3.1 节），协效应提供是 `ctx.effect` 调用并继承其自动跟踪和恢复。算法 2 实现 `ctx.set(key, value)`，即具体的 `set(k, v)`：回调在领域符号 $\rho(k)$ 下将值绑定到存储中，返回的 dispose 函数移除它。安装和移除都调用 `notify` 将变更传播给依赖组件。

</template>
</Bilingual>

```
Algorithm 2  Coeffect operations
 1  function get(ctx, key)
 2    realm ← ctx[@@isolate][key]          ▷ ρ(k)
 3    return ctx[@@store][realm]            ▷ σ(ρ(k))
 4  function set(ctx, key, value)
 5    function callback()
 6      realm ← ctx[@@isolate][key]         ▷ ρ(k)
 7      ctx[@@store][realm] ← value         ▷ σ[ρ(k) ↦ v]
 8      notify(ctx, [key])
 9      return function()
10        delete ctx[@@store][realm]        ▷ σ \ ρ(k)
11        notify(ctx, [key])
12    return ctx.effect(callback)
```

<Bilingual>
<template #en>

Algorithm 3 propagates each binding change to dependents by testing, for each live fiber, whether a changed key appears in its `fiber.inject` and resolves to the same realm; if so, it calls `refresh` (Section 5.1.3) to re-evaluate that fiber against the new state, and it returns the fibers it re-evaluated so that a caller can wait for them. This is the reactive classification of Definition 26: a change that flips satisfaction activates or deactivates the fiber, and `refresh`'s idempotence renders a neutral change harmless. The interaction of this re-evaluation with diverse control flows is developed in Section 5.1.3.

A binding counts as available to a dependent only while the fiber that installed it is `ACTIVE`, so `refresh` resolves each declared key against an active provider rather than against the store alone. This is the `provided by` relation of Definition 46, and it is what makes a withdrawal visible to dependents one step before it happens: a provider that has entered `UNLOADING` has stopped providing, so its dependents recompute an unsatisfied target view and begin their own teardown while its bindings are all still in place.

**Isolation and interception.** The two operations do structurally the same thing: each derives a child context that adjusts one inherited table for key, leaving the parent untouched, so recovery is implicit: discarding the child context suffices, with no explicit inverse to run. `ctx.isolate(key, realm)` overrides the realm mapping $\rho$ with realm, or a freshly generated symbol by default (realizing `isolate`, Definition 29), so two contexts that assign different symbols to the same key resolve to independent bindings. `ctx.intercept(key, metadata)` merges metadata into the interception table $\iota$ (realizing `intercept`, Definition 31): following that definition, the new metadata is combined with whatever the context already carries for key and takes priority over it.

</template>
<template #zh>

算法 3 将每个绑定变更传播给依赖者：对每个活跃 fiber，测试变更的键是否出现在其 `fiber.inject` 中并解析到相同领域；若是，调用 `refresh`（第 5.1.3 节）针对新状态重新评估该 fiber，并返回重新评估的 fiber 使调用者可以等待它们。这是定义 26 的反应式分类：翻转满足性的变更激活或去激活 fiber，而 `refresh` 的幂等性使中性变更无害。这种重新评估与多样控制流的交互在第 5.1.3 节展开。

绑定仅在安装它的 fiber 处于 `ACTIVE` 时才对依赖者可用，因此 `refresh` 针对活跃提供者而非仅针对存储解析每个声明的键。这是定义 46 的 `provided by` 关系，也是使撤回在发生前一步对依赖者可见的关键：进入 `UNLOADING` 的提供者已停止提供，因此其依赖者重新计算出不满足的目标视图，并在其绑定全部仍在位时开始自己的拆卸。

**隔离和拦截。** 两个操作在结构上做相同的事：各自派生一个子上下文，为键调整一个继承的表，保持父上下文不变，因此恢复是隐式的：丢弃子上下文即可，无需运行显式逆。`ctx.isolate(key, realm)` 用 realm 覆盖领域映射 $\rho$，默认为新生成的符号（实现 `isolate`，定义 29），因此为同一键分配不同符号的两个上下文解析到独立绑定。`ctx.intercept(key, metadata)` 将元数据合并到拦截表 $\iota$（实现 `intercept`，定义 31）：遵循该定义，新元数据与上下文已为键携带的内容组合并优先于它。

</template>
</Bilingual>

```
Algorithm 3  Reactive notification
 1  function notify(ctx, keys)
 2    affected ← ∅
 3    for fiber in all_fibers do
 4      for key in keys do
 5        if key ∈ fiber.inject and fiber.ctx[@@isolate][key] = ctx[@@isolate][key] then
 6          refresh(fiber)
 7          affected ← affected ∪ {fiber}
 8          break
 9    return affected
```

#### 5.1.3. Component Lifecycle

<Bilingual>
<template #en>

A component is instantiated as a fiber by `ctx.use`. This section gives the fiber (introduced in Section 5.1) operational meaning as the inertial state machine of Section 4.3.3. Two fields drive the algorithm below: `fiber.parent`, the parent context of `fiber.ctx` that forms the component hierarchy (the recursive structure of $\Gamma_\infty$, Section 3.3.1), and `fiber.inertia`, a handle to the in-flight asynchronous transition (or null if idle).

Algorithm 4 shows component instantiation. A component pairs a coeffect specification `component.inject` ($d$) with an effect function `component.apply`; instantiation binds the component's config into `fiber.apply` (Line 9), the config-applied effect function ($e$) that the lifecycle then runs. The callback function (Line 2) is the effect tracked in the parent fiber: when executed, it initiates the child's lifecycle by calling `refresh` (Algorithm 5); when recovered, it forces the child's target to $\bot$ and triggers unload. This is the registration primitive of Definition 47, with callback as its O-Insert and the closure callback returns as its O-Retire: an instantiation is an ordinary tracked effect of the parent, so unloading a parent cascades to its children.

</template>
<template #zh>

组件通过 `ctx.use` 实例化为 fiber。本节赋予 fiber（第 5.1 节引入）作为第 4.3.3 节惯性状态机的操作语义。两个字段驱动下面的算法：`fiber.parent`，构成组件层次（$\Gamma_\infty$ 的递归结构，第 3.3.1 节）的 `fiber.ctx` 的父上下文；以及 `fiber.inertia`，飞行中异步转换的句柄（空闲时为 null）。

算法 4 展示组件实例化。组件将协效应规格 `component.inject`（$d$）与效应函数 `component.apply` 配对；实例化将组件的配置绑定到 `fiber.apply`（第 9 行），即生命周期随后运行的配置应用效应函数（$e$）。回调函数（第 2 行）是父 fiber 中跟踪的效应：执行时通过调用 `refresh`（算法 5）发起子组件的生命周期；恢复时强制子组件的目标为 $\bot$ 并触发卸载。这是定义 47 的注册原语，以 callback 作为其 O-Insert，callback 返回的闭包作为其 O-Retire：实例化是父组件的普通跟踪效应，因此卸载父组件级联到其子组件。

</template>
</Bilingual>

```
Algorithm 4  Component instantiation
 1  function callback()
 2    refresh(fiber)
 3    return function()
 4      fiber.target ← ⊥
 5      unload(fiber)
 6
 7  fiber ← Fiber(parent: ctx, inject: component.inject)
 8  fiber.ctx ← ctx[fiber → fiber]
 9  fiber.apply ← () → component.apply(fiber.ctx, config)
10  ctx.effect(callback)
11  return fiber
```

<Bilingual>
<template #en>

Algorithm 5 realizes the inertial state machine of Section 4.3.3, in which reload and unload are inertial: once entered, a transition runs to completion before the system responds to a target-state change. It uses two auxiliary lookups over the coeffect store: `resolve(inject)` returns the bindings the declared keys currently resolve to, and `provided(fiber)` returns the keys whose binding this fiber installed. The `refresh` function recomputes `fiber.target` from the coeffect store and, if the fiber is not already in a transition, initiates either a reload or unload task. The `reload` function records the current target and executes the component's effect function `apply`. Upon completion, it checks whether the target still matches: if so, the fiber enters `ACTIVE`; if not (regardless of whether the new target is $\bot$ or a different set of providers), it chains into `unload`. Symmetrically, `unload` recovers all tracked effects in LIFO order and then either enters `INACTIVE` or chains into `reload`. This mutual recursion implements the inertial property: once a transition begins, it completes before any new transition can start.

`fiber.target` is computed by resolving each declared key against the current coeffect store and tupling the uid of the fiber that provides it, so it is a digest of `target(γ, n)` (Definition 46). Identifying a binding by its provider rather than by its value is what makes a single comparison against the recorded target sufficient: a uid is drawn fresh and never reused, so a provider that is replaced cannot be mistaken for the one it replaced, even when the two provide equal values. Since `notify` (Section 5.1.2) recomputes the target on every coeffect change, a fiber reloads precisely when one of its declared keys comes to be provided by a different fiber. A provider that overwrites its own binding in place is therefore not observed; a component that wants its replacement to propagate withdraws the binding and installs it afresh.

The algorithm operates at two complementary levels. At the transition level, `reload` and `unload` check the target at completion, enabling inertial chaining across transitions. At the iteration level within each transition, the effect execution (Algorithm 1) checks the target at each iteration boundary, enabling partial rollback within a single transition. These two mechanisms correspond to the inter-transition chaining of Section 4.3.3 and the intra-transition staleness check that Theorem 64 rests on.

Three lines carry the coeffect ordering of Theorem 63, and where each of them sits is what makes the ordering hold. `reload` commits the resolved view at Line 14 and `unload` discards it only after every inverse has run, so a fiber reads the same bindings for as long as it is loaded, its own teardown included. `refresh` marks the fiber `UNLOADING` at Line 10 before the transition task is created, which is the L-Leave step: the fiber stops providing, and the dependents recompute against that before any of its inverses is scheduled. `unload` then waits at Line 25 for each notified dependent to reach `INACTIVE`, which is the guard on L-Unload; `notify` admits a dependent only when its declared key resolves to the same realm symbol as the provider's, which is the runtime form of the guard's demand that the dependent see the key from this fiber rather than merely declare it. The wait sits ahead of the whole recovery rather than inside one of the inverses being waited on, since `fiber.dispose` initiates a fiber's effects concurrently and a wait placed within one of them would leave the rest unordered. Termination follows Theorem 66: a fiber only ever waits on dependents that have already stopped being satisfiable, and a dependent that is itself a provider waits the same way for its own, so the provider graph is traversed on demand rather than analyzed in advance.

</template>
<template #zh>

算法 5 实现第 4.3.3 节的惯性状态机，其中 reload 和 unload 是惯性的：一旦进入，转换在系统响应目标状态变化之前运行到完成。它使用两个对协效应存储的辅助查找：`resolve(inject)` 返回声明键当前解析到的绑定，`provided(fiber)` 返回此 fiber 安装了绑定的键。`refresh` 函数从协效应存储重新计算 `fiber.target`，若 fiber 不在转换中，则发起 reload 或 unload 任务。`reload` 函数记录当前目标并执行组件的效应函数 `apply`。完成时检查目标是否仍匹配：若匹配，fiber 进入 `ACTIVE`；若不匹配（无论新目标是 $\bot$ 还是不同的提供者集），则链接到 `unload`。对称地，`unload` 以 LIFO 顺序恢复所有跟踪效应，然后进入 `INACTIVE` 或链接到 `reload`。这种互递归实现惯性属性：一旦转换开始，它在任何新转换开始之前完成。

`fiber.target` 通过针对当前协效应存储解析每个声明键并组元提供它的 fiber 的 uid 来计算，因此它是 `target(γ, n)`（定义 46）的摘要。以提供者而非值标识绑定使得与记录目标的一次比较即可：uid 是新生成的且永不重用，因此被替换的提供者不会与替换它的那个混淆，即使两者提供相等的值。由于 `notify`（第 5.1.2 节）在每次协效应变更时重新计算目标，fiber 恰在其某个声明键开始由不同 fiber 提供时重新加载。因此原地覆盖自身绑定的提供者不被观察到；希望其替换传播的组件撤回绑定并重新安装。

算法在两个互补层面运作。在转换层面，`reload` 和 `unload` 在完成时检查目标，实现跨转换的惯性链接。在每个转换的迭代层面，效应执行（算法 1）在每个迭代边界检查目标，实现单转换内的部分回滚。这两种机制分别对应第 4.3.3 节的转换间链接和定理 64 所依赖的转换内陈旧性检查。

三行承载定理 63 的协效应排序，它们各自的位置使排序成立。`reload` 在第 14 行提交解析视图，`unload` 仅在每个逆运行后才丢弃它，因此 fiber 在加载期间读取相同绑定，包括自身拆卸。`refresh` 在第 10 行于转换任务创建前将 fiber 标记为 `UNLOADING`，这是 L-Leave 步骤：fiber 停止提供，依赖者在任何逆被调度之前据此重新计算。`unload` 然后在第 25 行等待每个被通知的依赖者到达 `INACTIVE`，这是 L-Unload 上的守卫；`notify` 仅在依赖者声明键解析到与提供者相同的领域符号时接纳它，这是守卫要求依赖者从此 fiber 而非仅声明键看到它的运行时形式。等待位于整个恢复之前而非被等待的某个逆内部，因为 `fiber.dispose` 并发启动 fiber 的效应，放在其中一个内部的等待会使其余无序。终止性遵循定理 66：fiber 只等待已停止可满足的依赖者，而本身是提供者的依赖者以同样方式等待自己的依赖者，因此提供者图按需遍历而非预先分析。

</template>
</Bilingual>

```
Algorithm 5  Component lifecycle

 1  function refresh(fiber)
 2    target ← target(γ, n)
 3    if target = fiber.target then return
 4    fiber.target ← target
 5    if fiber.inertia then return
 6    if target ≠ ⊥ then
 7      fiber.state ← LOADING
 8      fiber.inertia ← create_task(reload(fiber))
 9    else
10      fiber.state ← UNLOADING  ▷ out of service before any inverse is scheduled
11      fiber.inertia ← create_task(unload(fiber))
12  async function reload(fiber)
13    target₀ ← fiber.target
14    fiber.committed ← resolve(fiber.inject)  ▷ commit the view
15    recover ← await execute(fiber.apply, () ↦ fiber.target = target₀)
16    fiber.dispose ← recover ∘ fiber.dispose
17    if fiber.target = target₀ then
18      fiber.state ← ACTIVE
19      notify(fiber.ctx, provided(fiber))
20      fiber.inertia ← null
21    else
22      fiber.state ← UNLOADING
23      fiber.inertia ← create_task(unload(fiber))
24  async function unload(fiber)
25    await all.notify(fiber.ctx, provided(fiber)).map(f → f.await())  ▷ drain dependents
26    await fiber.dispose()
27    fiber.dispose ← id
28    fiber.committed ← ⊥
29    if fiber.target = ⊥ then
30      fiber.state ← INACTIVE
31      fiber.inertia ← null
32    else
33      fiber.state ← LOADING
34      fiber.inertia ← create_task(reload(fiber))
```

#### 5.1.4. Context Access

<Bilingual>
<template #en>

The coeffect operations of Section 5.1.2 form a reflective API: a coeffect is written with `ctx.set(key, value)` and read with `ctx.get(key)`, both keyed by name. Cordis layers a second, more native way to extend and consume the context on top of this reflective API: property access. A component can access a coeffect as the property `ctx[key]`, as if it were native structure of the context, rather than through a method call. In TypeScript, Cordis realizes this with a `Proxy` whose get trap mediates every property access. Algorithm 6 shows how a context resolves such an access to a coeffect, atop the primitive `get` of Section 5.1.2.

Algorithm 6 walks the fiber chain upward from the accessing context: at the first fiber whose committed view binds key, the access is authorized and that binding is returned; if the walk reaches a fiber that declares key without having committed it, the fiber is not loaded and the access fails; and if it reaches the root without any declaration, the access is rejected as undeclared. This is where the proxy differs from the bare `ctx.get`: `ctx.get(key)` is a lookup against the store that returns the bound value or nothing and never fails, whereas the proxy resolves against the accessing fiber's own view and enforces the coeffect specification $d$ at the point of use. Reading the view rather than the store is also what Theorem 63 rests on, since it is what keeps a dependency readable to a component whose teardown was triggered by that dependency going away.

This rejection is a runtime check performed at the point of access. Because a component's coeffect specification $d$ is declared statically, the same violation is in principle detectable at compile time, by resolving each `ctx[key]` against the declared $d$ before execution; Section 6.4 discusses how a host language's type-level dependency declarations and compile-time metaprogramming can carry out exactly this mediation.

</template>
<template #zh>

第 5.1.2 节的协效应操作构成反射式 API：协效应以 `ctx.set(key, value)` 写入、以 `ctx.get(key)` 读取，两者均按键名。Cordis 在此反射 API 之上叠加第二种更原生的扩展和消费上下文的方式：属性访问。组件可以作为属性 `ctx[key]` 访问协效应，如同它是上下文的原生结构，而非通过方法调用。在 TypeScript 中，Cordis 用 `Proxy` 实现这一点，其 get trap 中介每次属性访问。算法 6 展示上下文如何在此反射 `get`（第 5.1.2 节）之上将此类访问解析为协效应。

算法 6 从访问上下文沿 fiber 链向上遍历：在第一个提交视图绑定 key 的 fiber 处，访问被授权并返回该绑定；若遍历到达声明 key 但未提交的 fiber，则 fiber 未加载且访问失败；若到达根而无任何声明，则访问作为未声明被拒绝。这是 proxy 与裸 `ctx.get` 的区别：`ctx.get(key)` 是对存储的查找，返回绑定值或空且从不失败，而 proxy 针对访问 fiber 自身的视图解析并在使用点强制协效应规格 $d$。读视图而非存储也是定理 63 所依赖的，因为它使依赖对因该依赖消失而触发拆卸的组件仍可读。

此拒绝是在访问点执行的运行时检查。由于组件的协效应规格 $d$ 是静态声明的，同样的违反原则上可在编译时检测，方法是在执行前将每个 `ctx[key]` 针对声明的 $d$ 解析；第 6.4 节讨论宿主语言的类型级依赖声明和编译时元编程如何精确执行此中介。

</template>
</Bilingual>

```
Algorithm 6  Proxy-mediated context access
 1  function resolve(ctx, key)
 2    fiber ← ctx.fiber
 3    repeat
 4      if key ∈ fiber.committed then return fiber.committed[key]
 5      if key ∈ fiber.inject then throw INACTIVE_ACCESS
 6      if fiber = root then throw UNDECLARED_ACCESS
 7      fiber ← fiber.parent.fiber
```

### 5.2. Component Loader

<Bilingual>
<template #en>

The core library equips component developers with imperative primitives for dynamic composition, such as `ctx.effect`, `ctx.use`, and `ctx.set`. A separate concern arises for application orchestrators, who assemble pre-existing components into a running system and adjust the composition over its lifetime. The component loader addresses this concern by introducing a declarative configuration layer: the orchestrator specifies the desired composition as a persistent data structure, and the loader translates changes to this specification into the corresponding imperative fiber operations.

</template>
<template #zh>

核心库为组件开发者提供动态组合的命令式原语，如 `ctx.effect`、`ctx.use` 和 `ctx.set`。应用编排者面临另一个关注点：将既有组件组装为运行系统并在其生命周期内调整组合。组件加载器通过引入声明式配置层解决此关注：编排者将期望组合指定为持久数据结构，加载器将对此规格的变更翻译为对应的命令式 fiber 操作。

</template>
</Bilingual>

#### 5.2.1. Declarative Configuration

<Bilingual>
<template #en>

Section 4 decomposes a running system into fibers, each an instantiation of one component. Everything an instantiation needs can be declared, so an orchestrator can describe a whole system as a declarative configuration: a persistent record that the loader realizes as fibers and keeps in step with them.

**Entries.** A configuration consists of entries. Each entry specifies a fiber and manages it, and the binding runs in both directions: the loader responds to a change in an entry's fields by adjusting the fiber, and a component that revises its own configuration or disables itself has the change written back to its entry.

**Definition 74.** An entry declares a single fiber, recording:
- `id` — a stable identifier, used as the reconciliation key when its group's child list changes;
- `url` — the URL of the component module to instantiate;
- `isolate` — an isolation annotation applied to the entry's context;
- `intercept` — an interception annotation applied to the entry's context;
- `config` — the configuration bound into the component to form its effect function `apply`;
- `disabled` — whether the entry is administratively turned off.

An entry can serve as a faithful specification because what supports a fiber is exactly what an entry records. The support set of Definition 67 reads $\tau, \pi, d$, and $p$ and nothing else, and an entry gives all four: `disabled` gives $\tau$, the entry's parent in the tree gives $\pi$, and `url` selects the component which declares $d$ and $p$. The fields the support set leaves unread are the fiber's runtime state, which an instantiation does not need either, and Lemma 70 identifies the support set with the installed fibers of a quiescent state (Definition 49) as far as each component installs every key it declares (Definition 69).

These entries form a configuration tree that is the authoritative record of what the system loads. An entry may be a leaf mapping to a single fiber, or its component may in turn load further components, making the entry a branch node. Cordis provides components for such grouped and nested loading: `@cordisjs/group` takes a list of child entries as its configuration and loads them as a subgroup, and `@cordisjs/include` loads an external configuration file (YAML or JSON) and grafts its entries in as a nested subtree. Both are ordinary components resting on the registration primitive of Definition 47 (Algorithm 4), so a nested tree stays within the calculus and the results below hold of it.

</template>
<template #zh>

第 4 节将运行系统分解为 fiber，每个是组件的实例化。实例化所需的一切都可声明，因此编排者可将整个系统描述为声明式配置：加载器实现为 fiber 并与之保持同步的持久记录。

**条目。** 配置由条目组成。每个条目指定一个 fiber 并管理它，绑定双向运行：加载器通过调整 fiber 响应条目字段的变化，修订自身配置或禁用自身的组件将变更写回其条目。

**定义 74.** 条目声明单个 fiber，记录：
- `id` — 稳定标识符，当其组的子列表变化时用作协调键；
- `url` — 要实例化的组件模块的 URL；
- `isolate` — 应用于条目上下文的隔离注解；
- `intercept` — 应用于条目上下文的拦截注解；
- `config` — 绑定到组件以形成其效应函数 `apply` 的配置；
- `disabled` — 条目是否被管理性关闭。

条目可以作为忠实的规格，因为支撑 fiber 的正是条目记录的。定义 67 的支撑集读取 $\tau, \pi, d$ 和 $p$，别无其他，而条目给出全部四个：`disabled` 给出 $\tau$，条目在树中的父节点给出 $\pi$，`url` 选择声明 $d$ 和 $p$ 的组件。支撑集未读的字段是 fiber 的运行时状态，实例化同样不需要，引理 70 在每个组件安装其声明的每个键（定义 69）的前提下将支撑集等同于静止状态的已安装 fiber（定义 49）。

这些条目形成配置树，是系统加载内容的权威记录。条目可以是映射到单个 fiber 的叶子，或其组件可以进一步加载更多组件，使条目成为分支节点。Cordis 为此类分组和嵌套加载提供组件：`@cordisjs/group` 以子条目列表为配置并作为子组加载，`@cordisjs/include` 加载外部配置文件（YAML 或 JSON）并将其条目嫁接为嵌套子树。两者都是基于定义 47（算法 4）注册原语的普通组件，因此嵌套树留在演算内，以下结果对它成立。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Reconciliation.** When an entry's record changes, the loader reconciles incrementally rather than tearing the fiber down and rebuilding it wholesale. Reconciling this way is sound for reasons the metatheory supplies.

- Theorem 73 makes the quiescent state a function of the final configuration alone: whatever instantiations and retirements the loader performs on the way, and in whatever order, the system quiesces where a load of the final configuration from scratch would have left it. Which components end up loaded is read off the declarations only as far as each of them installs every key it declares (Definition 69); a component that declares a key and installs it under some configurations alone is one the loader can still reconcile, but the set of loaded components then answers to those configurations as well.
- Theorem 66 proves that the system does quiesce, so a reconciliation is complete once its instantiations and retirements have been issued.
- Corollary 62 puts a departing fiber's contribution to the state at nothing, so rebuilding one entry withdraws what its fiber installed and leaves the fibers around it as they were.
- Theorem 63 lets the entries be instantiated together, with no load order for the orchestrator to arrange: a fiber whose declared keys are not yet provided waits at its L-Begin, and one whose provider leaves is deactivated ahead of it. A dependency therefore constrains when a fiber activates rather than when its module is fetched and evaluated, so the loader loads modules concurrently, where bringing up a large configuration spends its time.

On top of the fiber that an entry declares, the loader dispatches on which of the entry's fields changed and applies the least disruptive operation for each.

- `id`, `url` — rebuilds the entry, since its identity or its component has changed;
- `isolate` — reassigns the entry's realms (Algorithm 7);
- `intercept` — updated in place, as interception metadata is consulted at read time and needs no reload;
- `config` — handed to the component, which decides how to apply the new payload, typically by diffing it against the previous one and reloading only on a material change. In particular, an `@cordisjs/group` entry's config is its list of child entries, so it applies the update as a keyed diff over child ids, creating, removing, or updating each child; since updating a surviving child re-enters this same per-field dispatch, group reconciliation and entry update recurse together down the tree;
- `disabled` — unloads the fiber when set and reloads it when cleared.

</template>
<template #zh>

**协调。** 当条目的记录变化时，加载器增量协调而非拆毁 fiber 并整体重建。如此协调是可靠的，原因由元理论提供。

- 定理 73 使静止状态仅为最终配置的函数：无论加载器沿途执行什么实例化和退役、以何种顺序，系统静止于从零加载最终配置所会留下的位置。哪些组件最终加载仅从声明读出，前提是每个组件安装其声明的每个键（定义 69）；声明键但仅在某些配置下安装它的组件仍可被加载器协调，但加载的组件集也响应那些配置。
- 定理 66 证明系统确实静止，因此协调在其实例化和退役发出后即完成。
- 推论 62 将离开 fiber 对状态的贡献设为零，因此重建一个条目撤回其 fiber 安装的内容并使周围 fiber 保持原样。
- 定理 63 允许条目一起实例化，编排者无需安排加载顺序：声明键尚未被提供的 fiber 在其 L-Begin 等待，提供者离开的在其之前被去激活。因此依赖约束 fiber 何时激活而非何时获取和评估其模块，加载器并发加载模块——启动大型配置的时间花在这里。

在条目声明的 fiber 之上，加载器根据条目的哪个字段变化分派，对每个应用最小破坏性操作。

- `id`、`url` — 重建条目，因其身份或组件已变；
- `isolate` — 重新分配条目的领域（算法 7）；
- `intercept` — 原地更新，因拦截元数据在读取时查询且无需重载；
- `config` — 交给组件决定如何应用新载荷，通常通过与前一个 diff 并仅在实质性变化时重载。特别地，`@cordisjs/group` 条目的配置是其子条目列表，因此它将更新作为子 id 上的键控 diff 应用，创建、移除或更新每个子条目；由于更新存活的子条目重新进入同样的逐字段分派，组协调和条目更新沿树一起递归；
- `disabled` — 设置时卸载 fiber，清除时重载。

</template>
</Bilingual>

<Bilingual>
<template #en>

**Managed realms.** Isolation in the core derives a child context overriding the realm table $\rho$ at one key (Section 5.1.2), which suffices while the context tree stands still. An entry may be moved between groups at runtime, so the loader manages realms of its own, and the `isolate` field selects between two scoping rules per key. A value of `true` asks for a local realm, private to the entry and tagged by its id, which the entry carries with it wherever it moves; a string asks for a global realm shared by every entry naming that string, so moving such an entry changes which entries it shares a binding with rather than which realm it belongs to. A realm is discarded once no entry names it.

Reassigning an entry's realms turns on which keys changed realm, whether the entry is itself the provider at a changed key, and which dependents to notify. The middle question is the hard one, since a realm symbol may be shared by several fibers of which only one is the provider. The loader answers it with delimiters: one symbol $\delta$ per key, under which each context stores a tag of its own. A delimiter is written on a context and inherited by its descendants, so the entry's tag and the provider's agree exactly when the two were derived within one isolate scope for $k$, which is the case in which the binding at $k$ is the entry's own and has to move with it.

</template>
<template #zh>

**托管领域。** 核心中的隔离派生覆盖领域表 $\rho$ 在一个键上的子上下文（第 5.1.2 节），在上下文树静止时足够。条目可能在运行时在组间移动，因此加载器管理自己的领域，`isolate` 字段为每个键在两种作用域规则间选择。值 `true` 请求本地领域，为条目私有并由其 id 标记，条目无论移到哪里都携带它；字符串请求由每个命名该字符串的条目共享的全局领域，因此移动此类条目改变的是它与哪些条目共享绑定而非属于哪个领域。一旦没有条目命名领域，它被丢弃。

重新分配条目的领域取决于哪些键改变了领域、条目本身是否是变更键的提供者、以及通知哪些依赖者。中间的问题最难，因为领域符号可能被多个 fiber 共享而只有一个是提供者。加载器用定界符回答：每个键一个符号 $\delta$，每个上下文在其下存储自己的标签。定界符写在上下文上并由其后代继承，因此条目的标签和提供者的标签恰在两者在同一 $k$ 的隔离作用域内派生时一致，这正是 $k$ 处绑定是条目自身且必须随其移动的情况。

</template>
</Bilingual>

```
Algorithm 7  Isolation realm reassignment
 1  function patch_isolation(entry, ρ')
 2    ρ ← entry.ctx[@@isolate]
 3    store ← entry.ctx[@@store]
 4    Δ ← {k | ρ(k) ≠ ρ'(k)}                    ▷ keys whose realm changes
 5    for k in Δ do
 6      entry.ctx[δ_k] ← fresh tag
 7      diff[k] ← (ρ(k), ρ'(k), entry.ctx[δ_k], store[ρ(k)].fiber.ctx[δ_k])
 8    entry.ctx[@@isolate] ← ρ'
 9    reload(entry.fiber)
10    for k in Δ do
11      (s₁, s₂, d₁, d₂) ← diff[k]
12      if d₁ = d₂ and store[s₁] and not store[s₂] then  ▷ the binding is the entry's own
13        store[s₂] ← store[s₁]
14        delete store[s₁]
15    function affected(fiber, k)
16      (s₁, s₂, d₁, d₂) ← diff[k]
17      return fiber.ctx[@@isolate][k] ∈ {s₁, s₂} and (fiber.ctx[δ_k] = d₁) ≠ (d₂ = d₁)
18    notify(entry.ctx, Δ, affected)  ▷ in place of the realm test of Algorithm 3
```

<Bilingual>
<template #en>

The test turns on one property of delimiters. The tag under $\delta_k$ is written on the entry's context and inherited by every context derived from it, and it is drawn afresh at each reassignment, so for a context $\gamma'$

$$
\gamma'[\delta_k] = d_1 \quad \Longleftrightarrow \quad \gamma' \text{ is derived from the entry's context}\tag{65}
$$

Write $\mathrm{own}(\gamma')$ for that condition, of which $d_2 = d_1$ is the instance at the provider. The reassignment moves the contexts satisfying $\mathrm{own}$ from $s_1$ to $s_2$ and leaves the others where they are, and by the loop above it moves the binding to $s_2$ exactly when the provider satisfies $\mathrm{own}$. A dependent sees the binding while its own realm at $k$ is the realm the binding sits in. Where $\mathrm{own}$ agrees on the dependent and the provider, both move or neither does, so the dependent sees the binding afterwards exactly when it saw it before. Where $\mathrm{own}$ separates them, one side moves and the other stays, so the dependent gains or loses the binding. The inequality is that separation, and the membership test drops the dependents resolving $k$ in neither realm, which no part of the move reaches.

</template>
<template #zh>

测试取决于定界符的一个性质。$\delta_k$ 下的标签写在条目的上下文上并由从它派生的每个上下文继承，且在每次重分配时新生成，因此对上下文 $\gamma'$

$$
\gamma'[\delta_k] = d_1 \quad \Longleftrightarrow \quad \gamma' \text{ 从条目的上下文派生}\tag{65}
$$

记该条件为 $\mathrm{own}(\gamma')$，其中 $d_2 = d_1$ 是提供者处的实例。重分配将满足 $\mathrm{own}$ 的上下文从 $s_1$ 移到 $s_2$，其余留在原处，且由上述循环，恰在提供者满足 $\mathrm{own}$ 时将绑定移到 $s_2$。依赖者在 $k$ 处的自身领域是绑定所在领域时看到绑定。$\mathrm{own}$ 在依赖者和提供者上一致时，两者都移或都不移，因此依赖者之后恰在之前看到绑定时看到它。$\mathrm{own}$ 分离两者时，一方移而另一方留，因此依赖者获得或失去绑定。不等式就是该分离，成员测试丢弃在两个领域中都不解析 $k$ 的依赖者——移动的任何部分都不触及它们。

</template>
</Bilingual>

#### 5.2.2. Hot Module Replacement

<Bilingual>
<template #en>

Hot module replacement (HMR) applies the revertible-effect pattern at the module level: when source files change, typically during development, the system replaces the affected modules in-place without restarting the process. Because a fiber already bounds all of its component's effects and coeffects, a module that is itself a component can be replaced through fiber operations alone: disposing the old fiber recovers everything the component installed, and a new fiber instantiated from the reloaded module reinstalls it. HMR therefore needs no developer-annotated acceptance boundaries, as opposed to Webpack or Vite HMR.

The `@cordisjs/hmr` component provides the HMR engine, which operates in three phases.

**Phase 1: Module classification.** The engine takes two inputs: the stashed set (file URLs whose contents have changed since the last reload) and the externals set (modules that cannot be hot-replaced and instead trigger a full restart). Writing `get_imports(url)` for the modules that url directly imports, it classifies the changes' dependency subgraph, marking each module accepted or declined. Seeded with the imports of the stashed files, the fixed point accepts a module once one of its imports is accepted and declines one once all of its imports are declined; any module left undecided, caught in an import cycle, defaults to declined.

**Phase 2: Stale-entry detection.** Using accepted and declined, the engine then filters the component entries down to the stale ones, whose dependency tree reaches a changed module. It walks each entry's tree with `get_dependencies`, which collects the transitive imports of a module while respecting declined as a boundary. An entry is stale exactly when its tree intersects accepted; that tree is then folded into accepted, so every stale module along it is invalidated in the next phase.

**Phase 3: Transactional reload.** Finally, the engine reloads the stale entries. It invalidates the accepted modules' caches, backing up each removed module to enable rollback, then re-imports each stale entry's component module by its url and swaps in a fresh fiber. The transactional guarantee ensures that the system never enters a half-reloaded state: if any module fails to import (e.g., due to a syntax error), the caches are restored and every stale entry is rebuilt from `backup[entry.url]`, the previous component whose cache was just restored, undoing the swaps already made.

</template>
<template #zh>

热模块替换（HMR）在模块级应用可逆效应模式：当源文件变化时（通常在开发期间），系统原地替换受影响模块而不重启进程。由于 fiber 已经界定了组件的所有效应和协效应，本身是组件的模块可以仅通过 fiber 操作被替换：处置旧 fiber 恢复组件安装的一切，从重载模块实例化的新 fiber 重新安装它。因此 HMR 不需要开发者标注的接受边界，不同于 Webpack 或 Vite HMR。

`@cordisjs/hmr` 组件提供 HMR 引擎，分三阶段运作。

**阶段 1：模块分类。** 引擎接受两个输入：暂存集（自上次重载以来内容已变的文件 URL）和外部集（无法热替换而触发完全重启的模块）。以 `get_imports(url)` 表示 url 直接导入的模块，它分类变更的依赖子图，将每个模块标记为接受或拒绝。以暂存文件的导入为种子，不动点在模块的一个导入被接受时接受它，在所有导入被拒绝时拒绝它；任何未决模块（陷入导入环）默认拒绝。

**阶段 2：陈旧条目检测。** 使用 accepted 和 declined，引擎将组件条目过滤为陈旧的——其依赖树到达变更模块的条目。它用 `get_dependencies` 遍历每个条目的树，后者收集模块的传递导入同时以 declined 为边界。条目恰在其树与 accepted 相交时陈旧；该树随后折入 accepted，因此沿它的每个陈旧模块在下一阶段被失效。

**阶段 3：事务性重载。** 最后，引擎重载陈旧条目。它使 accepted 模块的缓存失效，备份每个移除的模块以启用回滚，然后按 url 重新导入每个陈旧条目的组件模块并换入新 fiber。事务性保证确保系统永不进入半重载状态：若任何模块导入失败（如语法错误），缓存被恢复，每个陈旧条目从 `backup[entry.url]`（刚恢复缓存的先前组件）重建，撤销已做的交换。

</template>
</Bilingual>

```
Algorithm 8  Module classification
 1  function classify(stashed, externals)
 2    accepted ← stashed
 3    declined ← externals
 4    pending ← ∅
 5    for url in stashed do
 6      pending ← pending ∪ (get_imports(url) \ (accepted ∪ declined))
 7    repeat
 8      progress ← false
 9      for url in pending do
10        if get_imports(url) ∩ accepted ≠ ∅ then
11          accepted ← accepted ∪ {url}
12          pending ← pending \ {url}
13          progress ← true
14        else if get_imports(url) ⊆ declined then
15          declined ← declined ∪ {url}
16          pending ← pending \ {url}
17          progress ← true
18        else
19          pending ← pending ∪ (get_imports(url) \ (accepted ∪ declined))
20    until not progress
21    declined ← declined ∪ pending
22    return (accepted, declined)
```

```
Algorithm 9  Stale-entry detection
 1  function get_dependencies(root, declined)
 2    deps ← ∅
 3    function traverse(url)
 4      if url ∈ deps or url ∈ declined then return
 5      deps ← deps ∪ {url}
 6      for child in get_imports(url) do traverse(child)
 7    traverse(root)
 8    return deps
 9  function detect(entries, accepted, declined)
10    stale_entries ← ∅
11    for entry in entries do
12      tree ← get_dependencies(entry.url, declined)
13      if tree ∩ accepted ≠ ∅ then
14        accepted ← accepted ∪ tree
15        stale_entries ← stale_entries ∪ {entry}
16    return stale_entries
```

```
Algorithm 10  Transactional module reload
 1  function reload(ctx, accepted, stale_entries)
 2    backup ← invalidate_caches(accepted)
 3    try
 4      for entry in stale_entries do
 5        entry.fiber.dispose()
 6        entry.fiber ← ctx.use(import(entry.url), entry.config)
 7    catch error
 8      restore_caches(backup)
 9      for entry in stale_entries do
10        entry.fiber.dispose()
11        entry.fiber ← ctx.use(backup[entry.url], entry.config)
12      throw error
```

### 5.3. Case Study: Koishi

<Bilingual>
<template #en>

Koishi is an open-source chatbot application framework built on Cordis. Over four years of development, it has accumulated over 4000 community-contributed plugins, ranging from instant-messaging (IM) adapters and database drivers to administrative consoles and end-user features. Its scale and diversity make it a representative validation of Cordis's dynamic composability in a production setting.

**Expressiveness and generality of the meta-framework.** Koishi runs as a server-side bot whose every feature is realized as a plugin over the context primitives of Section 5.1; Koishi itself contributes only the chatbot-domain vocabulary. The same model reappears in a wholly different runtime: Koishi's web console is a second, independent Cordis application whose plugins compose the primitives of the browser and its user interface rather than those of the server. The disparate settings above establish two properties of the model of Section 3. (1) It is expressive: its primitives suffice to carry a complete production system, the host framework supplying only domain vocabulary. (2) It is general: it fixes how effects and coeffects compose while leaving their meaning to each application, and so presupposes neither a particular domain nor a particular runtime.

**Temporal composability without cognitive overhead.** The plugin systems surveyed in Section 1.2.1 cannot unload an individual extension's effects without restarting the extension host. Koishi routinely performs this operation: an orchestrator disables a plugin from the console and its effects are withdrawn in place; during development, the HMR engine re-applies edited plugins on save while preserving cache state and live connections elsewhere in the system. Cordis makes such removal not merely possible but effortless for the plugin author. Because effects performed through the context are tracked and their inverses composed automatically (Section 3.1), even an inexperienced author obtains ordered cleanup for a plugin's context-mediated effects without writing an uninstall path. This achieves the locality of concern whose absence Section 1.2.1 identifies: correctness that would otherwise rest on each author's diligence is instead discharged once, by the abstraction.

**Spatial composability across an open ecosystem.** In contrast to the plugin systems of Section 1.2.1, where inter-plugin dependencies are largely absent, Koishi's ecosystem exhibits a genuine dependency topology: IM adapters provide access to each messaging platform, database drivers provide persistent storage, and functional plugins declare these as coeffects and access them. Reconfiguring a provider at runtime, such as switching the storage backend or reconnecting an adapter, reactivates only the dependents whose resolved dependency changed (Section 3.2); a plugin whose dependency is unavailable stays inactive until it appears, without erroring. What the case study substantiates is that this composition holds across independently authored code: a plugin and its dependencies are typically written by different authors who coordinate on nothing beyond the coeffect that connects them, so reactive coeffects keep the assembly consistent across an open ecosystem of independent contributors.

**Threats to validity.** The evidence here is drawn from a single ecosystem in a single host language, so it cannot separate the merits of the paradigm from those of its TypeScript realization or of Koishi's particular domain, and it is observational rather than a controlled comparison against an alternative architecture. What the case study establishes is thus an existence-and-adoption result rather than a quantitative one; measuring the abstraction's overhead and its effect on developer productivity against a baseline remains future work.

</template>
<template #zh>

Koishi 是基于 Cordis 构建的开源聊天机器人应用框架。经过四年开发，它积累了超过 4000 个社区贡献的插件，涵盖即时通讯（IM）适配器、数据库驱动、管理控制台和终端用户功能。其规模和多样性使其成为 Cordis 动态可组合性在生产环境中的代表性验证。

**元框架的表达力和通用性。** Koishi 作为服务端机器人运行，每个功能都实现为第 5.1 节上下文原语上的插件；Koishi 自身仅贡献聊天机器人领域词汇。同一模型出现在完全不同的运行时中：Koishi 的 Web 控制台是第二个独立的 Cordis 应用，其插件组合浏览器及其用户界面的原语而非服务器的。上述不同设定确立了第 3 节模型的两个属性。(1) 它有表达力：其原语足以承载完整的生产系统，宿主框架仅提供领域词汇。(2) 它通用：它固定效应和协效应如何组合而将它们的含义留给每个应用，因此既不预设特定领域也不预设特定运行时。

**无认知开销的时间可组合性。** 第 1.2.1 节调查的插件系统不重启扩展宿主就无法卸载单个扩展的效应。Koishi 常规性地执行此操作：编排者从控制台禁用插件，其效应就地撤回；开发期间，HMR 引擎在保存时重新应用编辑过的插件，同时保留缓存状态和系统其余部分的活跃连接。Cordis 使这种移除不仅可能而且对插件作者毫不费力。由于通过上下文执行的效应被跟踪且逆自动复合（第 3.1 节），即使缺乏经验的作者也能为插件上下文中介的效应获得有序清理而无需编写卸载路径。这实现了第 1.2.1 节指出的缺失的关切局部性：原本依赖每位作者勤勉的正确性转而由抽象一次性卸载。

**开放生态中的空间可组合性。** 与第 1.2.1 节插件间依赖基本缺失不同，Koishi 生态系统展现真实的依赖拓扑：IM 适配器提供对每个消息平台的访问，数据库驱动提供持久存储，功能插件将这些声明为协效应并访问它们。在运行时重新配置提供者（如切换存储后端或重连适配器）仅重新激活解析依赖变化的依赖者（第 3.2 节）；依赖不可用的插件保持非活跃直到它出现，不报错。案例研究证实的是这种组合在独立编写的代码间成立：插件及其依赖通常由不同作者编写，他们仅协调整合它们的协效应，因此反应式协效应在独立贡献者的开放生态中保持组装一致。

**有效性威胁。** 这里的证据来自单一生态系统和单一宿主语言，因此无法将范式的优劣与其 TypeScript 实现或 Koishi 特定领域的优劣分开，且是观察性而非与替代架构的受控比较。因此案例研究建立的是存在与采用结果而非定量结果；在基线上测量抽象的开销及其对开发者生产力的影响仍是未来工作。

</template>
</Bilingual>

## 6. Discussion

<Bilingual>
<template #en>

The formal model and implementation presented in the preceding sections introduce a programming paradigm for dynamic composability. This section examines how the paradigm extends to broader engineering concerns, and discusses the design tensions and open problems.

</template>
<template #zh>

前几节呈现的形式模型和实现引入了动态可组合性的编程范式。本节考察该范式如何扩展到更广泛的工程关注，并讨论设计张力和开放问题。

</template>
</Bilingual>

### 6.1. System Boundary

<Bilingual>
<template #en>

Every effect in Section 3.1 carries an inverse, and what that inverse amounts to is settled by the system boundary. The boundary divides the environment a system runs against into two parts. (1) A location lies inside when the system is able to modify it exclusively and to restore the state before that modification, so an operation on it is tracked in $\Gamma$ and can be recovered later. (2) A location lies outside when either ability fails, so an operation on it acts as $\mathrm{id}_\Gamma$ and is therefore neither tracked nor recovered. This section develops the properties of this boundary and their consequences for recovery.

**Boundaries from coeffects.** A coeffect moves the boundary by reifying an external location: it confines every access to that location to a set of operations it provides, each of which it can supply an inverse for, so operations that acted as $\mathrm{id}_\Gamma$ come to be tracked in $\Gamma$ and recovered. The boundary is therefore drawn per location rather than per medium, since both aforementioned abilities are properties of a location, and reification changes how a location is accessed while leaving its medium as it was. For example, a memory region lies inside when the system alone writes it, and outside when other processes write it too; a file lies inside when only the system can reach it, as with a scratch file under a private path, and outside when it is a path other programs read or write. Moving the boundary is itself a trade-off, between whether the environment provides revertible semantics for a location and what supplying those semantics costs on every access. We take up the co-design this suggests in Section 6.7.

**Acquisition and emission.** An operation that reaches outside the boundary generally proceeds in two stages. (1) In the acquisition stage, the operation obtains access and installs a record inside the boundary: `open` installs a descriptor that `close` removes, `malloc` reserves a block that `free` releases, `fork` starts a child process that `kill` terminates. The record itself is part of the coeffect that reifies the location, e.g. an entry in a map it keeps, and installing that entry is a revertible effect. That record is at the same time the channel along which data can leave. (2) In the emission stage, the operation pushes data through that channel, as with the bytes a `write` hands to the file or the datagram a `send` puts on the wire, and the push acts as $\mathrm{id}_\Gamma$, leaving the data where other parties may read and write it. The two stages therefore fall on opposite sides of the boundary: the acquisition stays inside it, whereas the emission crosses to the outside.

**Withholding and compensation.** A system that must nonetheless recover from an emission has two approaches available. One is to withhold an emission until the state that produced it is certain to persist, which is the output commit problem of rollback-recovery. The other is compensation: an action that restores the state up to an equivalence the application supplies, coarser than the $\simeq$ of Definition 33, as in deleting a file that was created or refunding a charge that was made. Such actions compose in the same LIFO order as inverses do, so the composition of Section 3.1 transfers to them. The metatheory does not: the commutation of Definition 60 is proved against $\simeq$ and has to be re-established against the coarser one.

</template>
<template #zh>

第 3.1 节的每个效应都携带逆，而逆意味着什么由系统边界决定。边界将系统运行所针对的环境分为两部分。(1) 当系统能够独占地修改一个位置并恢复修改前的状态时，该位置位于内部，对其的操作在 $\Gamma$ 中被跟踪且可稍后恢复。(2) 当任一能力失效时，位置位于外部，对其的操作作为 $\mathrm{id}_\Gamma$，因此既不被跟踪也不被恢复。本节发展此边界的属性及其对恢复的后果。

**来自协效应的边界。** 协效应通过具体化外部位置来移动边界：它将对位置的所有访问限制为它提供的一组操作，每个操作都能提供逆，因此作为 $\mathrm{id}_\Gamma$ 的操作开始在 $\Gamma$ 中被跟踪和恢复。因此边界按位置而非介质划定，因为上述两种能力都是位置的属性，而具体化改变的是位置被访问的方式而非其介质。例如，内存区域在系统独写时位于内部，在其他进程也写时位于外部；文件在仅系统可达时（如私有路径下的临时文件）位于内部，在其他程序读写时位于外部。移动边界本身是一种权衡：环境是否为位置提供可逆语义，以及提供这些语义在每次访问时的代价。我们在第 6.7 节讨论由此暗示的协同设计。

**获取和发射。** 到达边界外的操作通常分两阶段进行。(1) 在获取阶段，操作获得访问并在边界内安装记录：`open` 安装 `close` 移除的描述符，`malloc` 保留 `free` 释放的块，`fork` 启动 `kill` 终止的子进程。记录本身是具体化位置的协效应的一部分（如它保持的映射中的一个条目），安装该条目是可逆效应。该记录同时也是数据可以离开的通道。(2) 在发射阶段，操作通过该通道推送数据，如 `write` 交给文件的字节或 `send` 放到线上的数据报，推送作为 $\mathrm{id}_\Gamma$，将数据留在其他方可能读写的地方。因此两阶段落在边界两侧：获取留在内部，发射跨越到外部。

**扣留和补偿。** 仍须从发射中恢复的系统有两种方法。一是扣留发射直到产生它的状态确定会持续，这是回滚恢复的输出提交问题。二是补偿：将状态恢复到应用提供的等价关系（比定义 33 的 $\simeq$ 更粗）的动作，如删除创建的文件或退还已收的款项。此类动作以与逆相同的 LIFO 顺序复合，因此第 3.1 节的复合传递到它们。元理论则不然：定义 60 的交换是针对 $\simeq$ 证明的，须针对更粗的等价重新建立。

</template>
</Bilingual>

### 6.2. Service Multiplexing

<Bilingual>
<template #en>

Dynamic component platforms such as OSGi organize composition around services: units of functionality that a provider publishes under an interface and a consumer binds to. The Cordis coeffect model echoes this notion, with a service corresponding to the interface behind a key. Components that provide a service are its providers, and components that inject a service are its consumers. A single service may be implemented by multiple providers, and this multiplicity can be realized in two forms. (1) Exclusive binding: several implementations share one interface but at most one is bound at a time; the orchestrator selects which implementation is bound, and switching between them requires unloading one provider and loading another, momentarily perturbing every consumer's dependency. (2) Service broker: a central service that acts as the entrypoint for the interface is injected by both the backing providers and the consumers, so that multiple providers coexist and the broker dispatches each request among them. Compared to exclusive binding, the broker absorbs this perturbation: updating a backing provider leaves the broker in place, so consumers see no change to their dependency and no reload is triggered.

The service broker underlies three capabilities: load balancing, rolling updates, and cross-process invocation.

**Load balancing.** When several providers coexist, the broker distributes requests among them according to a configurable policy (e.g., round-robin, least-loaded, latency-weighted) or an explicit target named by the consumer. Because providers are ordinary components, they can be added or removed to scale capacity up or down; each provider registers with the broker through a revertible effect, so unloading it reverts the registration and drops it from the broker's routing set automatically.

**Rolling updates.** Upgrading a service implementation at runtime reduces to a controlled provider transition. To carry out the transition, the new provider is loaded as an additional fiber and registers with the broker; once it becomes ACTIVE, traffic is gradually shifted from the old providers to the new one (e.g., by adjusting selection weights), and the old providers are unloaded once they no longer carry in-flight requests. This provider transition turns what is traditionally an infrastructure-level operation (e.g., container orchestration, blue-green deployment) into an application-level composition pattern.

**Cross-process invocation.** The service broker can also be applied across process boundaries. Each process hosts its own Cordis context with local providers; a coordinating component links them, treating each as a remote provider. Cross-process service access is mediated by an RPC mechanism that preserves the interface, making the distribution transparent to consumers. One caveat is that a cross-process call incurs latency and may fail mid-flight, so exposing it synchronously would block the caller. An interface intended to be exposed across processes must therefore be designed against an asynchronous contract.

</template>
<template #zh>

OSGi 等动态组件平台围绕服务组织组合：提供者在接口下发布的功能单元，消费者绑定到它。Cordis 协效应模型呼应此概念，服务对应键背后的接口。提供服务的组件是其提供者，注入服务的组件是其消费者。单个服务可由多个提供者实现，这种多重性可以两种形式实现。(1) 独占绑定：多个实现共享一个接口但一次最多绑定一个；编排者选择绑定哪个实现，切换需要卸载一个提供者并加载另一个，暂时扰动每个消费者的依赖。(2) 服务代理：作为接口入口点的中心服务被后端提供者和消费者同时注入，使多个提供者共存，代理在其中分派每个请求。相比独占绑定，代理吸收了此扰动：更新后端提供者时代理保持不变，因此消费者看不到依赖变化也不触发重载。

服务代理支撑三种能力：负载均衡、滚动更新和跨进程调用。

**负载均衡。** 多个提供者共存时，代理根据可配置策略（如轮询、最低负载、延迟加权）或消费者命名的显式目标在其中分发请求。由于提供者是普通组件，可以添加或移除以扩缩容；每个提供者通过可逆效应向代理注册，因此卸载它恢复注册并自动从代理的路由集中删除。

**滚动更新。** 运行时升级服务实现归约为受控的提供者转换。执行转换时，新提供者作为附加 fiber 加载并向代理注册；一旦变为 ACTIVE，流量逐渐从旧提供者转移到新的（如调整选择权重），旧提供者在不再承载飞行中请求时卸载。此提供者转换将传统的基础设施级操作（如容器编排、蓝绿部署）变为应用级组合模式。

**跨进程调用。** 服务代理也可跨进程边界应用。每个进程托管自己的 Cordis 上下文和本地提供者；协调组件链接它们，将每个视为远程提供者。跨进程服务访问由保持接口的 RPC 机制中介，使分布对消费者透明。一个注意事项是跨进程调用产生延迟且可能飞行中失败，因此同步暴露会阻塞调用者。意在跨进程暴露的接口必须针对异步契约设计。

</template>
</Bilingual>

### 6.3. Access Control and Sandboxing

<Bilingual>
<template #en>

Given an application assembled from independent components, securing the application calls for two complementary mechanisms: (1) constraining what dependencies a component may access, and (2) sandboxing untrusted code from the host environment. Cordis supports the first through dependency declarations and interception; the second requires an external sandbox.

**Capability-based access control.** The dependency access mechanism (Section 5.1.4) already constitutes a form of access control over proxy-mediated properties: a component can only access dependencies it has declared; an undeclared access raises an error. This is structurally similar to capability-based security, where authority is conferred by possession of a reference rather than by ambient authority. The inject declaration acts as a capability request, and the context proxy acts as a capability mediator. Since these requests are declared statically, the complete set of proxy-mediated capabilities a component requires is known before it runs, letting the orchestrator review and approve them at load time rather than discovering accesses as they happen.

This mediation generalizes to fine-grained policy through the interception mechanism. Access-control metadata can be carried by contexts or declared by components (Definition 30), and the provider consults it when the dependency is invoked to decide whether a request is permitted. For example, a filesystem dependency may carry metadata declaring which paths a component may read or write, and the provider checks each call against the metadata. Because this interception lives on the context rather than in either party's code, an orchestrator can adjust it to constrain any component's access to a dependency without modifying the provider, e.g., granting read-only database access to a community component whereas a core component retains full access. Moreover, since interception affects only how a dependency is invoked, not whether it is satisfied, it can be installed, reconfigured, or removed at runtime without triggering any reload or perturbing the dependency graph.

**Sandboxing untrusted components.** When a component's code cannot be trusted, language-level access control is insufficient, since a malicious component with access to the host runtime can reach the underlying objects directly, rendering such checks moot. Sandboxing requires an execution boundary beyond the reach of language-level means, such as software fault isolation, a separate language runtime, a sandboxed process, or a virtualized container. Whatever the mechanism, the untrusted component runs in its own sandboxed context and reaches host-provided dependencies through a bridge, generalizing the cross-process invocation of Section 6.2: the same transparency argument renders this bridged access indistinguishable from local injection. On the host side, the bridge is an ordinary fiber whose capabilities can be attenuated by the access control described above.

</template>
<template #zh>

给定由独立组件组装的应用，保护应用需要两种互补机制：(1) 约束组件可访问的依赖，(2) 将不可信代码与宿主环境沙箱化。Cordis 通过依赖声明和拦截支持前者；后者需要外部沙箱。

**基于能力的访问控制。** 依赖访问机制（第 5.1.4 节）已构成对代理中介属性的访问控制：组件只能访问已声明的依赖；未声明的访问抛出错误。这在结构上类似于基于能力的安全，权威由持有引用而非环境权威赋予。inject 声明充当能力请求，上下文代理充当能力中介。由于这些请求是静态声明的，组件所需的代理中介能力全集在运行前已知，使编排者可在加载时审查和批准它们而非在发生时发现访问。

此中介通过拦截机制推广到细粒度策略。访问控制元数据可由上下文携带或由组件声明（定义 30），提供者在依赖被调用时查询它以决定请求是否被允许。例如，文件系统依赖可携带声明组件可读写哪些路径的元数据，提供者针对元数据检查每次调用。由于此拦截存在于上下文而非任一方代码中，编排者可调整它以约束任何组件对依赖的访问而无需修改提供者，如给予社区组件只读数据库访问而核心组件保留完全访问。此外，由于拦截仅影响依赖如何被调用而非是否被满足，它可在运行时安装、重配置或移除而不触发任何重载或扰动依赖图。

**不可信组件的沙箱化。** 当组件代码不可信时，语言级访问控制不够，因为可访问宿主运行时的恶意组件可直接到达底层对象，使此类检查失效。沙箱需要超出语言级手段范围的执行边界，如软件故障隔离、独立语言运行时、沙箱进程或虚拟化容器。无论机制如何，不可信组件在自己的沙箱上下文中运行并通过桥接到达宿主提供的依赖，推广第 6.2 节的跨进程调用：同样的透明性论证使此桥接访问与本地注入不可区分。在宿主侧，桥接是普通 fiber，其能力可被上述访问控制削减。

</template>
</Bilingual>

### 6.4. Language Independence and Selection

<Bilingual>
<template #en>

Although Cordis is implemented in TypeScript, the context paradigm is language-agnostic: spatiotemporal composability is defined only by its two composability dimensions, and thus can be realized in any language that meets certain requirements along both. We analyze these requirements along each dimension in turn.

**Temporal composability.** At its most basic, temporal composability requires closures: a revertible effect pairs an action with an inverse, and that inverse must be captured as a value, along with the state it restores, so it can be replayed on teardown. Beyond this, a component's code and the side effects of loading it must be introducible and retractable at runtime.

How a language meets this second requirement depends on its execution model. In managed runtimes, this takes the form of a programmatic module registry, where a loaded module can be evicted from the registry and garbage-collected once unreferenced; Node.js, for instance, exposes such a registry. Native code exposes no module registry, so introduction and retraction take the form of explicit dynamic linking and unlinking (e.g., `dlopen`/`dlclose` on Unix, `LoadLibrary`/`FreeLibrary` on Windows), i.e., loading object code into a running process and later detaching it. WebAssembly takes one path or the other depending on its embedder: a module instance is reclaimed by the host's collector under a managed embedder (e.g., a JavaScript host), or released when a native embedder drops it (e.g., Wasmtime). Across these mechanisms, the revertible effects model treats loading as an effect on the context, with inverses that undo the registration of symbols, types, or handlers the module introduced.

**Spatial composability.** Spatial composability requires a mechanism for components to declare their dependencies and for the runtime to provide and inject these dependencies. This reduces to a dependency injection (DI) problem, which manifests at two levels that differ across languages: how dependencies are typed and how their access is mediated.

At the type level, the language should provide a way for developers to express well-typed dependency access. A consumer obtains a coeffect by reading its key from the context, so the context type (Section 3.2.1) must record each key's coeffect. Typeclasses (Haskell) and traits (Rust) achieve this by letting a provider extend the context type from its own module through an instance or impl. TypeScript's module augmentation likewise lets a provider module merge declarations into the context type.

At the runtime level, dependency access must be dynamically mediated: the coeffect behind a key may change as providers are loaded and unloaded, and may be resolved differently across contexts. The language therefore needs a way to interpose on access transparently, leaving the consumer's code unchanged, e.g., via JavaScript's `Proxy` object or Python's descriptor protocol (`__get__`). Absent such a primitive, runtime reflection can mediate access dynamically, at the cost of type safety and developer experience.

Across both levels, metaprogramming facilities supply the typing and the mediation together. Annotations and decorators attach metadata to a declaration, which a processor expands into the accessor that mediates access; compile-time metaprogramming (e.g., Rust procedural macros, Scala macros, Zig comptime) emits, for each dependency, a typed declaration together with such an accessor, dispensing with a general-purpose interception primitive.

</template>
<template #zh>

尽管 Cordis 以 TypeScript 实现，上下文范式是语言无关的：时空可组合性仅由其两个可组合性维度定义，因此可在满足两者特定要求的任何语言中实现。我们依次沿每个维度分析这些要求。

**时间可组合性。** 最基本地，时间可组合性需要闭包：可逆效应将动作与逆配对，逆必须作为值连同它恢复的状态一起捕获，以便在拆卸时重放。除此之外，组件的代码和加载它的副作用必须可在运行时引入和撤回。

语言如何满足第二个要求取决于其执行模型。在托管运行时中，这采取可编程模块注册表的形式，加载的模块可从注册表驱逐并在不再被引用时被垃圾回收；例如 Node.js 暴露这样的注册表。原生代码不暴露模块注册表，因此引入和撤回采取显式动态链接和取消链接的形式（如 Unix 上的 `dlopen`/`dlclose`，Windows 上的 `LoadLibrary`/`FreeLibrary`），即将目标代码加载到运行进程并稍后分离。WebAssembly 根据其嵌入者选择路径：在托管嵌入者（如 JavaScript 宿主）下模块实例由宿主回收器回收，在原生嵌入者（如 Wasmtime）下在其释放时回收。在这些机制中，可逆效应模型将加载视为对上下文的效应，逆撤销模块引入的符号、类型或处理程序的注册。

**空间可组合性。** 空间可组合性需要组件声明依赖、运行时提供和注入这些依赖的机制。这归约为依赖注入（DI）问题，在两个层面表现且因语言而异：依赖如何被类型化以及访问如何被中介。

在类型层面，语言应提供让开发者表达类型安全依赖访问的方式。消费者通过从上下文读取键获得协效应，因此上下文类型（第 3.2.1 节）必须记录每个键的协效应。Typeclass（Haskell）和 trait（Rust）通过让提供者从自己的模块通过 instance 或 impl 扩展上下文类型来实现。TypeScript 的模块增强同样让提供者模块将声明合并到上下文类型。

在运行时层面，依赖访问必须被动态中介：键背后的协效应可能随提供者加载和卸载而变化，且在不同上下文中可能解析不同。因此语言需要透明地在访问中介的方式，不改变消费者代码，如通过 JavaScript 的 `Proxy` 对象或 Python 的描述符协议（`__get__`）。缺少此类原语时，运行时反射可动态中介访问，代价是类型安全和开发者体验。

在两个层面，元编程设施同时提供类型化和中介。注解和装饰器将元数据附加到声明，处理器将其展开为中介访问的访问器；编译时元编程（如 Rust 过程宏、Scala 宏、Zig comptime）为每个依赖发出类型化声明连同此类访问器，免除通用拦截原语。

</template>
</Bilingual>

### 6.5. Mutual Dependencies and Component Granularity

<Bilingual>
<template #en>

In the reactive coeffect model, a dependency cycle simply leaves the involved components permanently inactive: given two components $A$ and $B$, if $A$ requires a key provided by $B$ and $B$ a key provided by $A$, neither's satisfaction predicate can ever become true. Unlike deadlock in concurrent systems, which depends on the schedule and must be detected as it happens, this condition is predictable from the dependency declarations alone, so a runtime can report it when components are loaded.

In practice, most apparently mutual dependencies can be decomposed into finer-grained components that eliminate the cycle. Consider two components: a server (providing a network interface) and an access controller (enforcing authorization policies). The two components interact bidirectionally: the access controller mediates requests arriving at the server, and the server exposes an endpoint for modifying access-control policies. A monolithic design would make each component depend on the other. However, the two interaction directions are logically independent concerns. Decomposing them yields four components: server-core, access-control-core, request-mediation (depending on both cores to apply access control to incoming requests), and policy-management (depending on both cores to expose policy modification via the server). Through this approach, the cycle is eliminated because neither core depends on the other; only the integration components depend on both.

This decomposition is always possible in principle, since every bidirectional interaction can be factored into independent unidirectional bindings, but it increases the number of components: in the general case, given $n$ mutually interacting components, the number of integration components can grow quadratically with $n$, since each pair of interacting components may require a distinct component for each direction of interaction. This does not affect correctness or runtime performance (components are lightweight), and finer granularity can be beneficial: users gain the ability to load only the specific integration bindings they need, effectively increasing the system's composability. However, it may affect developer experience: more components require more configuration, more naming, and more cognitive overhead in understanding the dependency graph.

Mitigating this granularity cost is an engineering concern rather than a theoretical one. Practical strategies include package bundling (i.e., grouping related fine-grained components into a single installable unit), convention-based wiring (i.e., automatically connecting components whose names or types match a pattern), and scaffold tooling (i.e., generating boilerplate integration components from declarative specifications). These strategies preserve the formal guarantees of the acyclic model while reducing the authoring burden to something closer to the monolithic case.

</template>
<template #zh>

在反应式协效应模型中，依赖环仅使涉及的组件永久非活跃：给定两个组件 $A$ 和 $B$，若 $A$ 需要 $B$ 提供的键且 $B$ 需要 $A$ 提供的键，两者的满足谓词永远不可能为真。与并发系统中的死锁（取决于调度且须在发生时检测）不同，此条件仅从依赖声明即可预测，因此运行时可在组件加载时报告。

实践中，大多数表面上的互依赖可分解为更细粒度的组件以消除环。考虑两个组件：服务器（提供网络接口）和访问控制器（执行授权策略）。两者双向交互：访问控制器中介到达服务器的请求，服务器暴露修改访问控制策略的端点。整体设计会使每个组件依赖另一个。然而两个交互方向是逻辑独立的关注。分解它们得到四个组件：server-core、access-control-core、request-mediation（依赖两个核心对入站请求应用访问控制）和 policy-management（依赖两个核心通过服务器暴露策略修改）。通过此方法，环被消除，因为两个核心互不依赖；只有集成组件依赖两者。

此分解原则上总是可行的，因为每个双向交互可分解为独立的单向绑定，但它增加了组件数量：一般情形下，给定 $n$ 个互交互组件，集成组件数量可与 $n$ 平方增长，因为每对交互组件可能为每个交互方向需要独立组件。这不影响正确性或运行时性能（组件轻量），且更细粒度可能有益：用户获得仅加载所需特定集成绑定的能力，有效增加系统可组合性。但可能影响开发者体验：更多组件需要更多配置、更多命名和更多理解依赖图的认知开销。

缓解此粒度成本是工程关注而非理论关注。实用策略包括打包（将相关细粒度组件分组为单个可安装单元）、基于约定的布线（自动连接名称或类型匹配模式的组件）和脚手架工具（从声明式规格生成样板集成组件）。这些策略保持无环模型的形式保证，同时将编写负担降低到接近整体情形。

</template>
</Bilingual>

### 6.6. Dependency Typing and Versioning

<Bilingual>
<template #en>

In the formal model, a dependency link is established purely by key identity: a component providing key $k$ satisfies any component declaring $k$ in its dependency set. The type family $\nu_k$ ensures type-level agreement within a single compilation unit, but this guarantee breaks down when components are developed and built independently, which is a common scenario in component ecosystems. This breakage leads to two distinct problems.

**Interface drift.** A provider may modify the interface associated with $k$ (adding fields, changing method signatures, altering behavioral contracts) between versions, while a consumer compiled against an earlier interface continues to declare the same key $k$. The dependency is satisfied at the coeffect level ($k \in \mathrm{dom}(\sigma)$), yet the runtime value no longer conforms to the consumer's expectations, leading to type errors, method-not-found failures, or silent behavioral divergence.

**Key collision.** Two independently developed providers may use the same key name $k$ to denote entirely unrelated interfaces. Since key identity alone establishes the link, a consumer expecting one provider's interface will accept the other's value without any compatibility check. Unlike interface drift, where the provider and consumer at least share a common lineage, key collision involves no relationship whatsoever between the expected and actual types, making the resulting failures unpredictable and difficult to diagnose.

Both problems point to the same gap: the coeffect model provides only nominal linking (by key name) but no versioned or structural linking (by interface compatibility). We discuss three approaches to the gap, from most infrastructure-coupled to most language-agnostic.

**Key namespacing.** Extending the key space from $K$ to $K \times P$, where $P$ identifies the interface-defining package, eliminates key collision by construction: independently developed interfaces with the same local name occupy distinct keys. This is the most direct solution but also the most coupled: it embeds the package namespace into the formal model itself, making the system dependent on an external package registry for key identity.

**Peer dependencies.** A lighter coupling is to declare version constraints through the host-language package manager. This is the approach Cordis currently adopts. Component dependencies are semantically peer dependencies: a component does not bundle its dependencies internally but expects the runtime context to supply them. Package managers with peer dependency support (e.g., npm) can enforce version compatibility: if the version of the package providing a key falls outside a consumer's declared peer range, the incompatibility is caught at install time rather than surfacing as a runtime failure. However, this approach has two limitations: (1) it depends on providers faithfully adhering to semantic versioning, which is an unenforceable convention; (2) package managers typically resolve each dependency to a single version, which prevents loading components from multiple versions of the same package within one application.

**Structural compatibility.** A fully language-agnostic approach would replace the membership check $k \in \mathrm{dom}(\sigma)$ with a compatibility predicate that verifies the provider's actual interface structurally subsumes the consumer's expectation. This is analogous to structural subtyping: a provider satisfies a consumer if the provided interface is a subtype of the required interface. The challenge lies in defining this predicate language-agnostically: structural compatibility is straightforward for record types (width subtyping) but becomes complex for behavioral contracts (e.g., pre/postconditions, effect specifications), and undecidable once parametric polymorphism introduces bounded quantification.

These three approaches address different aspects of the problem. Designing a unified dependency model that combines these approaches while preserving the dynamic composition guarantees of the coeffect model remains an open problem.

</template>
<template #zh>

在形式模型中，依赖链接仅由键标识建立：提供键 $k$ 的组件满足任何在其依赖集中声明 $k$ 的组件。类型族 $\nu_k$ 确保单一编译单元内的类型级一致，但当组件独立开发和构建时（组件生态系统中的常见场景）此保证失效。此失效导致两个不同问题。

**接口漂移。** 提供者可能在不同版本间修改与 $k$ 关联的接口（添加字段、改变方法签名、更改行为契约），而针对较早接口编译的消费者继续声明相同的键 $k$。依赖在协效应级满足（$k \in \mathrm{dom}(\sigma)$），但运行时值不再符合消费者期望，导致类型错误、方法未找到失败或静默行为分歧。

**键冲突。** 两个独立开发的提供者可能使用相同的键名 $k$ 表示完全不相关的接口。由于仅凭键标识建立链接，期望一个提供者接口的消费者会接受另一个的值而不做任何兼容性检查。与接口漂移（提供者和消费者至少共享共同血统）不同，键冲突在期望和实际类型之间没有任何关系，使导致的失败不可预测且难以诊断。

两个问题指向同一缺口：协效应模型仅提供名义链接（按键名）而无版本化或结构链接（按接口兼容性）。我们讨论三种方法，从最耦合基础设施到最语言无关。

**键命名空间化。** 将键空间从 $K$ 扩展到 $K \times P$（$P$ 标识接口定义包），构造上消除键冲突：具有相同本地名的独立开发接口占据不同键。这是最直接的解决方案但也最耦合：它将包命名空间嵌入形式模型本身，使系统依赖外部包注册表进行键标识。

**对等依赖。** 更轻的耦合是通过宿主语言包管理器声明版本约束。这是 Cordis 目前采用的方法。组件依赖在语义上是对等依赖：组件不在内部打包依赖而是期望运行时上下文提供它们。支持对等依赖的包管理器（如 npm）可强制版本兼容：若提供键的包版本落在消费者声明的对等范围之外，不兼容在安装时被捕获而非作为运行时失败浮现。但此方法有两个限制：(1) 依赖提供者忠实遵守语义化版本控制，这是不可强制的约定；(2) 包管理器通常将每个依赖解析为单一版本，这阻止在一个应用中加载同一包的多个版本的组件。

**结构兼容性。** 完全语言无关的方法会用兼容性谓词替换成员检查 $k \in \mathrm{dom}(\sigma)$，验证提供者的实际接口结构上包含消费者的期望。这类似于结构子类型化：若提供的接口是所需接口的子类型，则提供者满足消费者。挑战在于语言无关地定义此谓词：结构兼容性对记录类型（宽度子类型化）直观，但对行为契约（如前/后置条件、效应规格）变复杂，且一旦参数多态引入有界量化就不可判定。

这三种方法解决问题的不同方面。设计统一依赖模型以结合这些方法同时保持协效应模型的动态组合保证仍是开放问题。

</template>
</Bilingual>

### 6.7. Co-Design with Languages and Operating Systems

<Bilingual>
<template #en>

Section 6.4 identifies the minimum a host language must supply for the context paradigm. This section takes up the converse question, what a language or operating system co-designed with the paradigm can offer beyond that minimum.

**Co-design with languages.** A language designed around the context paradigm can improve on a library in two respects: the semantics it gives to contexts, and the primitives it gives to effects and coeffects.

Such a language can make the context implicit again while preserving the context semantics of Section 3.3. An imperative language already runs every statement against an implicit context, and that single context neither tracks effects nor resolves coeffects. The context paradigm instead distinguishes multiple contexts, where an operation either modifies the context it runs against or derives another from it (Definition 27). An in-place realization modifies the ambient context, just as an imperative language does. A derived realization instead introduces a separate context, for which the language must provide a construct. Making the context implicit brings both an ergonomic and a safety benefit. (1) In a library realization, every function involving effects or coeffects takes the context as an ordinary argument or a receiver, as in Section 5.1. Where the language supplies the context implicitly, functions no longer need to take it. (2) Every context carries its own lifecycle state and committed view (Section 4.1). A library realization passes a context as an ordinary variable, so a component may reach another component's context by mistake, through a closure or a global variable. An effect it installs there then leaks out of its own lifecycle, and a coeffect it reads there escapes its dependency specification. Making the context implicit closes both.

Such a language can also make effects and coeffects known to its compiler. (1) For effects, an effect iterator (Definition 51) allocates a closure at every step to hold the inverse together with the state it restores. With syntax for performing an effect, a compiler can emit a single state machine for the whole iteration and hold those inverses in its frame. (2) For coeffects, the coeffect specification can be admitted into the type system, with two benefits. First, a dependency cycle is reported at compile time instead of being left to the runtime (Section 6.5). Second, a dependency can be compared by the structure of its type rather than by key identity alone, as row types do, which is type-level support for the structural compatibility of Section 6.6.

**Co-design with operating systems.** Section 1.2.3 observes a coarse-grained substitute for dynamic composability, where the operating system supplies temporal composability at the granularity of a process, and the container orchestrator above it supplies spatial composability at the granularity of a service. An operating system co-designed with the paradigm would support fine-grained composition, by making the coeffect specification a component declares the whole of what it can reach, and by providing its own resources as coeffects.

Such an operating system can supply the sandbox that Section 6.3 defers to a mechanism outside the language. It does so by bounding a component to the dependencies it declares, supplying them when the component is loaded and leaving nothing else reachable from within it, as a WebAssembly module receives its imports from its embedder at instantiation. It can also provide the coeffect isolation and interception of Section 3.2.3 as abilities of its own, binding a key differently for each component and mediating the accesses it supplies.

Such an operating system can also provide its own resources as coeffects. A resource lying outside the boundary is made revertible where the runtime records each acquisition against the component that made it (Section 6.1), and every runtime keeps a record of its own. An operating system that provides the resource as a coeffect keeps that record once, since it is the party that hands the resource out and can attribute it to the component that asked. Memory and file descriptors are the immediate candidates, and tracking them for the sake of recovery has been done at the kernel interface. Furthermore, an operating system can make revertible some of the operations Section 6.1 can only withhold or compensate for. A system that performs a write to persistent storage transactionally can roll it back, and one built on copy-on-write or immutable storage reaches an earlier state by moving a pointer.

</template>
<template #zh>

第 6.4 节确定了宿主语言为上下文范式必须提供的最低要求。本节讨论反面问题：与范式协同设计的语言或操作系统能在此最低要求之上提供什么。

**与语言协同设计。** 围绕上下文范式设计的语言可在两方面改进库：它赋予上下文的语义，以及它赋予效应和协效应的原语。

这样的语言可以在保持第 3.3 节上下文语义的同时使上下文再次隐式。命令式语言已经针对隐式上下文运行每条语句，而该单一上下文既不跟踪效应也不解析协效应。上下文范式转而区分多个上下文，操作要么修改它运行的上下文要么从中派生另一个（定义 27）。就地实现修改环境上下文，正如命令式语言所做的。派生实现转而引入独立上下文，语言须为此提供构造。使上下文隐式带来人因和安全双重收益。(1) 在库实现中，涉及效应或协效应的每个函数都将上下文作为普通参数或接收者，如第 5.1 节。语言隐式提供上下文时，函数不再需要接受它。(2) 每个上下文携带自己的生命周期状态和提交视图（第 4.1 节）。库实现将上下文作为普通变量传递，因此组件可能通过闭包或全局变量误达另一组件的上下文。在那里安装的效应随后泄漏出自身生命周期，在那里读取的协效应逃逸其依赖规格。使上下文隐式关闭两者。

这样的语言还可使效应和协效应对其编译器可知。(1) 对于效应，效应迭代器（定义 51）在每步分配闭包以持有逆连同它恢复的状态。有了执行效应的语法，编译器可为整个迭代发出单一状态机并在其帧中持有这些逆。(2) 对于协效应，协效应规格可被接纳进类型系统，有两个收益。第一，依赖环在编译时报告而非留给运行时（第 6.5 节）。第二，依赖可按其类型的结构而非仅按键标识比较，如行类型所做，这是第 6.6 节结构兼容性的类型级支持。

**与操作系统协同设计。** 第 1.2.3 节观察到动态可组合性的粗粒度替代，其中操作系统以进程粒度提供时间可组合性，其上的容器编排器以服务粒度提供空间可组合性。与范式协同设计的操作系统将支持细粒度组合，方法是使组件声明的协效应规格成为它所能到达的全部，并将其自身资源作为协效应提供。

这样的操作系统可提供第 6.3 节推迟给语言外机制的沙箱。它通过将组件限定于其声明的依赖、在组件加载时提供它们且使其他一切不可从内部到达来实现，如同 WebAssembly 模块在实例化时从嵌入者接收其导入。它还可将第 3.2.3 节的协效应隔离和拦截作为自身能力提供，为每个组件不同地绑定键并中介它提供的访问。

这样的操作系统还可将其自身资源作为协效应提供。位于边界外的资源在运行时记录每次获取以归因于获取它的组件处（第 6.1 节）被变为可逆，每个运行时保持自己的记录。将资源作为协效应提供的操作系统仅保持该记录一次，因为它是分发资源的一方且能将其归因于请求的组件。内存和文件描述符是直接候选，且为恢复而在内核接口跟踪它们已有先例。此外，操作系统可使第 6.1 节只能扣留或补偿的一些操作变为可逆。以事务方式执行对持久存储写入的系统可回滚它，基于写时复制或不可变存储构建的系统通过移动指针到达较早状态。

</template>
</Bilingual>

## 7. Related Work

<Bilingual>
<template #en>

Dynamic composability intersects several established research areas. We survey the most relevant lines of work and distinguish our contribution from each of them.

</template>
<template #zh>

动态可组合性与多个既有研究领域交叉。我们调查最相关的工作线并区分我们的贡献与每条线。

</template>
</Bilingual>

### 7.1. Effect and Coeffect Systems

<Bilingual>
<template #en>

Section 2 reviewed effects and coeffects as the theoretical pillars underlying our work. We first situate the monadic effect systems now common in industrial practice, then survey three research lines that extend effects and coeffects in directions relevant to Cordis: recasting algebraic effects as capabilities, giving effects a reversible semantics, and unifying effects and coeffects under a single graded discipline.

**Monadic effect systems.** One family of libraries encodes effects in the type systems of existing general-purpose languages, representing them as monadic values that a runtime executes. ZIO in Scala models a computation as `ZIO[R, E, A]` and Effect-TS in TypeScript as `Effect<A, E, R>`, a generic type whose parameters describe its result, its typed errors, and the services its context must supply; the fp-ts library encodes the same error and requirement channels through Reader-based monad transformers. Two traits separate these systems from Cordis. First, the tracking is bought with a monadic embedding: a program obtains it only by being written inside the effect type, whereas Cordis tracks effects as an overlay over ordinary host code. Second, a requirement is discharged by interpretation, an installed service that supplies its operations, and when that service is withdrawn what its operations performed remains in place; Cordis instead pairs each effect with an inverse and re-resolves requirements as providers come and go.

**Algebraic effects as capabilities.** Algebraic effects (Section 2.1) make effect operations visible to the type system. The extension closest to our work is Brachthäuser et al.'s Effekt language, which reinterprets effect types as capabilities: an effect type expresses what a computation requires from its context rather than what side effects it may produce. This perspective, like ours, treats the context as a mediator of capabilities. Cordis and Effekt differ in two respects. (1) In purpose, algebraic effects make effects visible to enable modular interpretation, giving one operation many handler semantics, whereas Cordis makes them visible to enable tracking and reversion, pairing every context transformation with an inverse. (2) In setting, Effekt disciplines effects statically at the type level, defaulting to scope-based reasoning in which capabilities are second-class and confined to their lexical scope, and recovering first-class use through boxing, which lifts that restriction by tracking captured capabilities in types; Cordis instead disciplines effects at runtime, aiming at complete resource recovery on component removal; Section 6.7 takes up what a language that made the context second class in this sense would offer.

**Reversible effect semantics.** A parallel line gives effects a reversible semantics rather than an interpretive one. Heunen et al. model side effects in a reversible setting by adapting Hughes' arrows to dagger arrows and inverse arrows, capturing effects such as serialization and mutable store whose operations admit inverses. This is the formal account closest to our revertible effects: both pair each effect with the means to undo it rather than discharging it through a handler. The two differ in where reversibility resides, and in how much of it they demand. Heunen et al. work in a denotational, categorical setting where reversibility is a global property, guaranteed by construction since every computation is invertible, and the inverse is two-sided and recovered from the categorical structure. Cordis tracks inverses at runtime and requires less of them: not that the whole computation be reversible, but that each atomic effect admit a one-sided inverse, supplied by the caller at the point of application rather than derived, from which the inverse of any composite follows by composition (Section 3.1).

**Graded types as unified effects and coeffects.** Orchard et al. proposed graded modal types as an umbrella notion encompassing both effect reasoning (via graded monads) and coeffect reasoning (via graded comonads), realized in the Granule language, demonstrating that a single type system can track both what a computation does and what it needs; more recent work extends coeffects to imperative Java-like languages and to call-by-push-value. All of these operate at the type level: effects and coeffects are static annotations checked at compile time over lexically fixed scopes. Our contribution is orthogonal to this analysis: we lift the same two notions to runtime mechanisms, which lets Cordis handle dynamic composition. Temporal retraction and spatial dependency are re-resolved as the set of loaded components evolves, instead of being settled once over a fixed program text.

</template>
<template #zh>

第 2 节将效应和协效应作为我们工作理论基础进行回顾。我们首先定位现在工业实践中常见的单子效应系统，然后调查在与 Cordis 相关方向上扩展效应和协效应的三条研究线：将代数效应重铸为能力、赋予效应可逆语义、以及在单一分级准则下统一效应和协效应。

**单子效应系统。** 一类库在既有通用语言的类型系统中编码效应，将它们表示为运行时执行的单子值。Scala 中的 ZIO 将计算建模为 `ZIO[R, E, A]`，TypeScript 中的 Effect-TS 为 `Effect<A, E, R>`，其泛型类型参数描述结果、类型化错误和上下文须提供的服务；fp-ts 库通过基于 Reader 的单子变换器编码相同的错误和需求通道。两个特征将这些系统与 Cordis 分开。第一，跟踪以单子嵌入为代价：程序仅通过在效应类型内编写获得它，而 Cordis 将效应跟踪作为普通宿主代码上的覆盖。第二，需求通过解释（安装的提供其操作的服务）来解除，当该服务被撤回时其操作所执行的仍留在原处；Cordis 转而将每个效应与逆配对，并在提供者来去时重新解析需求。

**代数效应作为能力。** 代数效应（第 2.1 节）使效应操作对类型系统可见。最接近我们工作的扩展是 Brachthäuser 等人的 Effekt 语言，它将效应类型重新解释为能力：效应类型表达计算从上下文所需而非它可能产生的副作用。此视角与 ours 一样将上下文视为能力中介。Cordis 和 Effekt 在两方面不同。(1) 目的上，代数效应使效应可见以实现模块化解释，给一个操作多种处理程序语义，而 Cordis 使它们可见以实现跟踪和回退，将每个上下文变换与逆配对。(2) 设定上，Effekt 在类型级静态约束效应，默认为基于作用域的推理（能力是二等公民且限定于其词法作用域），通过装箱恢复一等使用（通过在类型中跟踪捕获的能力解除该限制）；Cordis 转而在运行时约束效应，旨在组件移除时完全资源恢复；第 6.7 节讨论在此意义上使上下文为二等公民的语言会提供什么。

**可逆效应语义。** 并行的一条线赋予效应可逆语义而非解释性语义。Heunen 等人通过将 Hughes 的箭头适配为 dagger 箭头和逆箭头，在可逆设定中建模副作用，捕获序列化和可变存储等操作允许逆的效应。这是最接近我们可逆效应的形式描述：两者都将每个效应与撤销它的手段配对而非通过处理程序解除。两者在可逆性所在之处和所要求的程度上不同。Heunen 等人在指称、范畴设定中工作，可逆性是全局属性，由构造保证（每个计算可逆），逆是双边的且从范畴结构恢复。Cordis 在运行时跟踪逆且要求更少：不要求整个计算可逆，而要求每个原子效应允许单边逆（由调用者在应用点提供而非推导），由此任何复合的逆通过复合得出（第 3.1 节）。

**分级类型作为统一效应和协效应。** Orchard 等人提出分级模态类型作为涵盖效应推理（通过分级单子）和协效应推理（通过分级余单子）的伞形概念，在 Granule 语言中实现，证明单一类型系统可同时跟踪计算做什么和需要什么；更近期的工作将协效应扩展到命令式类 Java 语言和 call-by-push-value。所有这些在类型级运作：效应和协效应是在词法固定作用域上编译时检查的静态标注。我们的贡献与此分析正交：我们将同样的两个概念提升为运行时机制，使 Cordis 能处理动态组合。时间回退和空间依赖随着加载组件集的演变被重新解析，而非在固定程序文本上一次确定。

</template>
</Bilingual>

### 7.2. Programming Paradigms

<Bilingual>
<template #en>

Section 3.3.3 established the context paradigm as a discipline that mediates effects and coeffects through an explicit context. Two established paradigms warrant explicit comparison: one shares our terminology, the other our treatment of crosscutting concerns.

**Context-oriented programming.** COP equips a language with layers—partial method and class definitions that are activated and deactivated at runtime according to the execution context, so that behavior adapts without the base code naming its context dependencies. COP and Cordis coincide in treating context as a first-class, runtime-mutable entity and in activating and deactivating behavior dynamically, but the resemblance is nominal. In COP, "context" denotes the ambient execution situation (e.g., location, user, mode), and activation changes method dispatch within a dynamically scoped extent; a layer neither tracks the side effects it induces nor reverts them, and activation is not governed by dependency satisfaction. In Cordis, the context is the $\Gamma_\infty$ entity mediating effects and coeffects: activation runs a component's revertible effects and is driven by reactive coeffect satisfaction (Section 3.2), and deactivation reverts them in full. COP varies what behavior runs; Cordis composes and reverts what effects and dependencies a component installs. Their difference is one of trade-off. COP folds activation into the host language's method dispatch, gaining dynamically-scoped layer extents at the cost of language specificity, whereas Cordis, as a language-agnostic overlay, resolves activation reactively over a shared context. Cordis can thus express as a coeffect only COP's global, value-driven fragment: context-dependent selection among implementations, but not dynamically-scoped activation.

**Aspect-oriented programming.** AOP modularizes a crosscutting concern into an aspect: a pointcut that quantifies over join points selected in the base program, and advice woven in at each. Cordis addresses the same problem of contextual behavior that would otherwise scatter across components, but its analogue of an aspect is a coeffect: a shared point of mediation many components declare a dependence on, so that crosscutting behavior can be reshaped there without editing any of them. The two paradigms then differ on two axes. (1) Declaration versus obliviousness: an AOP pointcut is oblivious and quantified, matching arbitrary join points whose code is unaware it is advised, whereas Cordis confines crosscutting to the coeffects each component declares, so its reach is exactly that declared surface. This yields determinacy and traceability: an application orchestrator can inspect and govern what cross-cuts a component at the configuration layer, without reading or analyzing its source, whereas an AOP concern is legible only through the aspects that quantify over it. (2) Lifecycle integration: a crosscutting change in Cordis is carried by a component's effects, reverted when the component unloads and propagated reactively to its dependents, so it is one move within the dynamic composition model; dynamic-AOP systems can also weave and unweave at runtime, but as a standalone operation, neither bound to a component's lifecycle nor triggering re-resolution among the advised code.

</template>
<template #zh>

第 3.3.3 节将上下文范式确立为通过显式上下文中介效应和协效应的准则。两个既有范式值得明确比较：一个与我们共享术语，另一个共享对横切关注的处理。

**面向上下文编程。** COP 为语言配备层——根据执行上下文在运行时激活和去激活的部分方法和类定义，使行为在不让基础代码命名其上下文依赖的情况下适应。COP 和 Cordis 在将上下文视为一等、运行时可变实体及动态激活和去激活行为上一致，但相似只是名义上的。在 COP 中，"上下文"表示环境执行情况（如位置、用户、模式），激活在动态作用域范围内改变方法分派；层既不跟踪它引发的副作用也不回退它们，且激活不由依赖满足性支配。在 Cordis 中，上下文是中介效应和协效应的 $\Gamma_\infty$ 实体：激活运行组件的可逆效应并由反应式协效应满足性驱动（第 3.2 节），去激活完全回退它们。COP 变化运行什么行为；Cordis 组合和回退组件安装什么效应和依赖。它们的区别是权衡。COP 将激活折入宿主语言的方法分派，以语言特定性为代价获得动态作用域的层范围，而 Cordis 作为语言无关的覆盖在共享上下文上反应式解析激活。因此 Cordis 作为协效应只能表达 COP 的全局、值驱动片段：实现间的上下文依赖选择，但不能动态作用域激活。

**面向方面编程。** AOP 将横切关注模块化为方面：在基础程序中选择的连接点上量化的切点，以及在每个处织入的通知。Cordis 解决同样的上下文行为否则会散布在组件中的问题，但其方面类似物是协效应：许多组件声明依赖的共享中介点，使横切行为可在那里重塑而无需编辑任何组件。两种范式在两个轴上不同。(1) 声明与无感知：AOP 切点是无感知且量化的，匹配代码不知道自己被通知的任意连接点，而 Cordis 将横切限定为每个组件声明的协效应，因此其到达正是声明的表面。这产生确定性和可追溯性：应用编排者可在配置层检查和治理什么横切组件，而无需阅读或分析其源码，而 AOP 关注仅通过量化它的方面才可读。(2) 生命周期集成：Cordis 中的横切变更由组件的效应承载，在组件卸载时回退并反应式传播给依赖者，因此是动态组合模型内的一步；动态 AOP 系统也可在运行时织入和取消织入，但作为独立操作，既不绑定组件生命周期也不在被通知代码间触发重新解析。

</template>
</Bilingual>

### 7.3. Temporal Composability

<Bilingual>
<template #en>

Temporal composability concerns replacing or removing a component in a running program while recovering the effects it installed. Prior approaches divide by how they treat a departing component's state and effects: carrying state forward to a successor version, recovering effects through developer-authored cleanup, reversing effects automatically within a scope fixed in advance, or reclaiming resources from a record the runtime accumulates by interposing on an interface.

**Stateful forward migration.** A broad family of systems replaces components in a running program without downtime by carrying their state forward across versions. All observe the same timing discipline: a component may be swapped only once it reaches a safe, interaction-free point. Kramer and Magee established this criterion as quiescence, which Vandewoude et al. later relaxed to the less disruptive tranquility; our rolling-update pattern (Section 6.2) enforces it by draining in-flight requests before unloading a provider. Dynamic software updating (DSU) then migrates state forward through hand-written transformation functions: Hicks et al.'s general-purpose DSU for C, Stoyle et al.'s type-safe update points via con-freeness analysis, and Hayden et al.'s Kitsune all map old-version data to new-version representations, inheriting heap objects, open files, and connections in place while re-initializing whatever is left unmigrated. The same discipline extends to persistent state: Overeem et al. convert a running event store's data between schema versions through hand-written upgrade operations while keeping the system available. Erlang/OTP takes the same stance at the process level, migrating state through `code_change/3` and recovering from faults by restarting supervised processes rather than reverting their effects; JavaScript's Hot Module Replacement (e.g., webpack, Vite) does the same at the module level, handing state forward through the `module.hot` or `import.meta.hot` API across a reload. Compared with Cordis's module replacement (Section 5.2), these approaches migrate in-memory state more gracefully: Cordis reverts the old component's tracked effects and reapplies the new component's from a clean slate, so a component's own in-memory state does not survive a reload unless placed in a longer-lived dependency, and layering DSU-style forward migration atop revertible effects is future work. Cordis's approach is nonetheless more robust: because every tracked effect is paired with an inverse, a failed reload restores the previous configuration automatically, without the hand-written migration logic DSU requires.

**Developer-authored recovery.** A second family recovers a component's effects through cleanup or compensation logic that the developer writes by hand. Plugin lifecycle conventions (e.g., OSGi, Eclipse's extension points, IntelliJ and VSCode) delegate cleanup to developer-written unload callbacks; the Command pattern encapsulates an operation together with an undo method for undo/redo stacks; the saga model structures a long-lived transaction as steps each paired with a compensating action; algebraic effect handlers can attach finalizers that run on teardown; and event sourcing retracts state by appending compensating events rather than executing an inverse at all. In all of them the inverse is an unenforced duty, decoupled from the operation, so that a forgotten one leaks resources silently (as documented empirically in Section 1.2.1). React's `useEffect` hook comes closest to pairing an effect with its inverse structurally, returning a cleanup the runtime invokes before each re-execution and on unmount. Its shortfall is composability: a hook may be called only at the top level of a component or another hook, never inside a conditional, loop, or nested function, and its effect body accepts neither an async function nor an iterator. Effects thus cannot be assembled from other effects or interleaved with control flow, leaving nothing from which a composite inverse could be derived. Cordis effects carry no such restriction: they are ordinary operations that compose freely and may run asynchronously, and require a hand-written inverse only for each atomic effect, from which the inverse of any composite is derived by composition, so that assembling existing effects requires writing no inverses at all. This structural pairing of every effect with its inverse makes complete recovery an invariant of the system rather than a matter of developer discipline.

**Statically scoped reversal.** A third family reverses effects automatically, by construction, but confines reversal to a scope fixed in advance. Software transactional memory, descended from hardware transactional memory, records a read/write log so that a group of memory operations either commits or aborts, rolling memory back to its pre-transaction state. Reversible computing, from Landauer and Bennett's thermodynamic analyses to reversible languages such as Janus, goes further and makes every step of a whole computation globally invertible. Reversible process calculi build backtracking into the semantics itself: RCCS carries a memory alongside each process and admits a step to be taken back when the past it leads to is causally equivalent, and Phillips and Ulidowski derive reversible operators for CCS, ACP, and CSP uniformly while preserving their forward operational semantics. Their causal-consistency criterion is the concurrent counterpart of the order Cordis's recovery follows, an accumulator applying a component's own inverses in last-in-first-out order and the guard of Section 4.3.1 deferring a provider's withdrawal until its consumers have deactivated (Theorem 63). The reach, however, is fixed by the semantics, every action performed remaining undoable, whereas a Cordis component supplies an inverse for each atomic effect and its accumulator brings the context back to where its composition began. Linear types, RAII, and Rust's ownership system tie a resource's release to a lexical region. Each fixes the scope and reach of reversal statically; Cordis, by contrast, fixes no such scope in advance: it reverts arbitrary context operations over a component's lifecycle, and treats lexical resource management as complementary, appropriate for local resources within a single component.

**Interposed reclamation.** A fourth family reclaims what a component acquired without the component itself supplying the inverses, by recording its acquisitions at an interface the runtime controls. Nooks wraps every call crossing the boundary between the Linux kernel and its loadable extensions, so that the kernel objects an extension touches pass through an object tracker whose record tells the recovery manager what to release when the extension fails; shadow drivers tap the same calls from the other side, recording the requests and configuration that determine a driver's state so that a restarted instance can be restored to it. Akeso obtains the record by compiler instrumentation instead, dividing kernel execution into nestable recovery domains that log their state changes and cross-thread dependencies, and rolling a faulting request back together with every domain that depends on it. Reclamation thus follows from a record the runtime maintains rather than from cleanup the developer remembers to write, which makes this family the closest systems-level precedent for revertible effects. It differs from Cordis in vocabulary and in reach. The platform fixes what can be recorded, whether as release code per kernel object type, one shadow per driver class, or an inverse per instrumented allocator, so a component may hold only resources the platform already knows how to release; a Cordis component instead introduces effects of its own and supplies an inverse for each atomic one (Section 3.1). Reclamation is likewise bounded by a request that commits or a restart of the same extension, whereas Cordis reverts over a component's whole lifetime and propagates removal to its dependents, which release their own effects in turn (Section 3.2).

</template>
<template #zh>

时间可组合性关注在运行程序中替换或移除组件同时恢复其安装的效应。先前方法按如何对待离开组件的状态和效应划分：将状态前向迁移到后继版本、通过开发者编写的清理恢复效应、在预先固定的作用域内自动反转效应、或从运行时通过在接口中介积累的记录回收资源。

**有状态前向迁移。** 一大类系统通过跨版本前向携带状态来不停机替换运行程序中的组件。所有都遵守相同的时序准则：组件仅在到达安全、无交互点时才可被交换。Kramer 和 Magee 将此准则确立为静止性，Vandewoude 等人后来放宽为较少扰动的 tranquility；我们的滚动更新模式（第 6.2 节）通过在卸载提供者前排空飞行中请求来强制它。动态软件更新（DSU）然后通过手写转换函数前向迁移状态：Hicks 等人针对 C 的通用 DSU、Stoyle 等人通过 con-freeness 分析的类型安全更新点、以及 Hayden 等人的 Kitsune 都将旧版本数据映射到新版本表示，继承堆对象、打开的文件和连接同时重新初始化未迁移的部分。同样的准则扩展到持久状态：Overeem 等人通过手写升级操作在保持系统可用的同时转换运行事件存储的数据。Erlang/OTP 在进程级采取同样立场，通过 `code_change/3` 迁移状态并通过重启受监督进程而非回退其效应来从故障恢复；JavaScript 的热模块替换（如 webpack、Vite）在模块级做同样的事，通过 `module.hot` 或 `import.meta.hot` API 在重载间前向传递状态。与 Cordis 的模块替换（第 5.2 节）相比，这些方法更优雅地迁移内存状态：Cordis 回退旧组件的跟踪效应并从干净状态重新应用新组件，因此组件自身的内存状态不在重载中存活除非放在更长生命的依赖中，在可逆效应之上叠加 DSU 式前向迁移是未来工作。然而 Cordis 的方法更鲁棒：因为每个跟踪效应都与逆配对，失败的重载自动恢复先前配置，无需 DSU 所需的手写迁移逻辑。

**开发者编写的恢复。** 第二类通过开发者手写的清理或补偿逻辑恢复组件的效应。插件生命周期约定（如 OSGi、Eclipse 扩展点、IntelliJ 和 VSCode）将清理委托给开发者编写的卸载回调；命令模式将操作与撤销方法一起封装用于撤销/重做栈；saga 模型将长事务结构化为每步配以补偿动作的步骤；代数效应处理程序可附加在拆卸时运行的终结器；事件溯源通过追加补偿事件而非执行逆来回退状态。在所有这些中，逆是未强制的义务，与操作解耦，因此遗忘的逆会静默泄漏资源（如第 1.2.1 节经验性记录的）。React 的 `useEffect` hook 最接近结构上将效应与逆配对，返回运行时在每次重新执行前和卸载时调用的清理。其不足是可组合性：hook 只能在组件或另一 hook 的顶层调用，从不在条件、循环或嵌套函数内，且其效应体既不接受 async 函数也不接受迭代器。因此效应无法从其他效应组装或与控制流交织，无从推导复合逆。Cordis 效应不受此限制：它们是自由组合且可异步运行的普通操作，仅要求每个原子效应有手写逆，由此任何复合的逆通过复合推导，因此组装既有效应完全无需编写逆。这种每个效应与逆的结构配对使完全恢复成为系统的不变式而非开发者纪律问题。

**静态作用域反转。** 第三类通过构造自动反转效应，但将反转限定在预先固定的作用域。软件事务内存源自硬件事务内存，记录读/写日志使一组内存操作要么提交要么中止，将内存回滚到事务前状态。可逆计算，从 Landauer 和 Bennett 的热力学分析到 Janus 等可逆语言，更进一步使整个计算的每步全局可逆。可逆进程演算将回溯构建进语义本身：RCCS 在每个进程旁携带记忆，当其导致的过去因果等价时允许取回一步，Phillips 和 Ulidowski 均匀地为 CCS、ACP 和 CSP 推导可逆算子同时保持其前向操作语义。它们的因果一致性准则是 Cordis 恢复所遵循顺序的并发对应——累加器以 LIFO 顺序应用组件自身的逆，第 4.3.1 节的守卫将提供者的撤回推迟到消费者去激活之后（定理 63）。然而到达范围由语义固定，执行的每个动作都保持可撤销，而 Cordis 组件为每个原子效应提供逆，其累加器将上下文带回其组合开始之处。线性类型、RAII 和 Rust 的所有权系统将资源释放绑定到词法区域。各自静态固定反转的作用域和范围；Cordis 相反不预先固定此类作用域：它在组件生命周期上回退任意上下文操作，并将词法资源管理视为互补的，适用于单个组件内的本地资源。

**中介式回收。** 第四类通过在运行时控制的接口记录组件的获取来回收组件所获取的内容，而无需组件自身提供逆。Nooks 包装跨越 Linux 内核与其可加载扩展间边界的每次调用，使扩展触及的内核对象通过对象跟踪器，其记录告诉恢复管理器在扩展失败时释放什么；影子驱动程序从另一侧窃听相同调用，记录决定驱动程序状态的请求和配置使重启的实例可恢复到它。Akeso 转而通过编译器插桩获得记录，将内核执行划分为可嵌套的恢复域，记录其状态变化和跨线程依赖，并将故障请求连同依赖它的每个域一起回滚。因此回收源于运行时维护的记录而非开发者记得编写的清理，这使此类成为可逆效应最近的系统级先例。它在词汇和范围上与 Cordis 不同。平台固定可记录什么，无论是每种内核对象类型的释放代码、每个驱动类的影子、还是每个插桩分配器的逆，因此组件只能持有平台已知如何释放的资源；Cordis 组件转而引入自己的效应并为每个原子效应提供逆（第 3.1 节）。回收同样受限于提交的请求或同一扩展的重启，而 Cordis 在组件整个生命周期上回退并将移除传播给依赖者，后者依次释放自己的效应（第 3.2 节）。

</template>
</Bilingual>

### 7.4. Spatial Composability

<Bilingual>
<template #en>

Spatial composability concerns how a component's dependencies on others are declared and bound. Prior mechanisms divide by how binding responds to change: wiring dependencies once at initialization, reacting to the availability of whole components, or propagating change at the granularity of individual values.

**Initialization-time dependency wiring.** Two established mechanisms wire components together at initialization time. Dependency injection frameworks (e.g., Spring, Guice, Angular, Inversify) inject dependencies into components at initialization, and UI framework context (e.g., Vue.js's provide/inject and React's Context API) passes them along a component tree. Some support dynamic scoping (e.g., Spring's prototype/request scopes, Angular's hierarchical injectors), but neither re-resolves reactively: when a provider is replaced or removed at runtime, existing dependents are neither deactivated nor re-initialized, and none offers lifecycle management of the kind our component state machine provides. Cordis's reactive coeffects (Section 3.2) supply this: the notification mechanism triggers lifecycle transitions whenever the satisfaction predicate changes.

**Availability-reactive component models.** The closest precedent to our reactive coeffects reacts to service availability. OSGi's Declarative Services and iPOJO let components declare provided and required services, with the runtime automatically activating and deactivating them as services appear and disappear; iPOJO's Gravity project explicitly targets autonomous runtime adaptation to changing service availability, and its provide/require model directly prefigures Cordis's `ctx.provide`/`ctx.get` pattern. R-OSGi extends the same abstraction transparently to distributed settings via RPC, mapping network failures to service-withdrawal events, a pattern Section 6.2 discusses as an extension of the Cordis model. All these systems recover through a deactivation callback, which is limited in two ways. First, the callback is hand-written, so resource safety rests on developer discipline and a forgotten one leaks silently. Second, the callback is synchronous: should teardown require an asynchronous exchange with the departing dependency, the frameworks offer no protocol to await it, forcing a blocking wait against a reference that may already be stale. Cordis's reactive coeffects close both gaps: deactivation reverts the dependents' accumulated effects, and its inertial state (Section 4.3.3) runs asynchronous teardown to completion before acting on further change.

**Value-level reactivity.** Functional reactive programming (FRP) and its modern incarnations (e.g., signals in SolidJS, Vue's reactivity system, Angular Signals) propagate change at a value-level granularity: when a signal changes, derived computations are re-evaluated synchronously or under a scheduler. Cordis's reactive coeffects act at a component-level granularity, adding asynchronous lifecycle semantics that value-level propagation does not model. The same granularity difference runs the other way for consistency: propagating in a turn, in an order the dependency graph fixes, lets FRP require that no derived computation read a mixture of updated and stale inputs, which is glitch freedom, whereas Cordis has no counterpart of a turn, orchestration actions arriving one at a time, and guarantees only that no single transition straddles two resolutions of its coeffects (Theorem 64). The two are complementary rather than competing: a Cordis coeffect can itself carry reactive values, and a component updates on only the parts it actually consumes, refining component-level reactivity into finer-grained reactive coeffects that span both levels.

</template>
<template #zh>

空间可组合性关注组件对其他组件的依赖如何被声明和绑定。先前机制按绑定如何响应变化划分：在初始化时一次布线依赖、对整个组件的可用性做出反应、或以单个值的粒度传播变化。

**初始化时依赖布线。** 两种既有机制在初始化时将组件连接在一起。依赖注入框架（如 Spring、Guice、Angular、Inversify）在初始化时将依赖注入组件，UI 框架上下文（如 Vue.js 的 provide/inject 和 React 的 Context API）沿组件树传递它们。一些支持动态作用域（如 Spring 的 prototype/request 作用域、Angular 的分层注入器），但都不反应式重新解析：当提供者在运行时被替换或移除时，既有依赖者既不被去激活也不被重新初始化，且都不提供我们的组件状态机所提供的那种生命周期管理。Cordis 的反应式协效应（第 3.2 节）提供此能力：通知机制在满足谓词变化时触发生命周期转换。

**可用性反应式组件模型。** 最接近我们反应式协效应的先例对服务可用性做出反应。OSGi 的声明式服务和 iPOJO 让组件声明提供和所需服务，运行时在服务出现和消失时自动激活和去激活它们；iPOJO 的 Gravity 项目明确针对对变化服务可用性的自主运行时适应，其 provide/require 模型直接预示了 Cordis 的 `ctx.provide`/`ctx.get` 模式。R-OSGi 通过 RPC 将同一抽象透明地扩展到分布式设定，将网络故障映射为服务撤回事件，第 6.2 节将此模式作为 Cordis 模型的扩展讨论。所有这些系统通过去激活回调恢复，这有两个限制。第一，回调是手写的，因此资源安全依赖开发者纪律，遗忘的回调静默泄漏。第二，回调是同步的：若拆卸需要与离开的依赖进行异步交换，框架不提供等待它的协议，迫使对可能已陈旧的引用进行阻塞等待。Cordis 的反应式协效应关闭这两个缺口：去激活回退依赖者积累的效应，且其惯性状态（第 4.3.3 节）在进一步变更前将异步拆卸运行到完成。

**值级反应性。** 函数反应式编程（FRP）及其现代化身（如 SolidJS 中的信号、Vue 的反应式系统、Angular Signals）以值级粒度传播变化：信号变化时，派生计算被同步或在调度器下重新评估。Cordis 的反应式协效应在组件级粒度运作，添加值级传播不建模的异步生命周期语义。同样的粒度差异在一致性方向也成立：在一轮中传播，以依赖图固定的顺序，让 FRP 要求没有派生计算读取更新和陈旧输入的混合，这是 glitch freedom，而 Cordis 没有轮的对应物，编排动作一次到达一个，仅保证没有单个转换跨越其协效应的两次解析（定理 64）。两者互补而非竞争：Cordis 协效应本身可携带反应式值，组件仅更新它实际消费的部分，将组件级反应性精化为跨两级的更细粒度反应式协效应。

</template>
</Bilingual>

## 8. Conclusion

<Bilingual>
<template #en>

We have presented a formal foundation for dynamic composability by lifting the classical concepts of effects and coeffects to runtime mechanisms. Revertible effects address local temporal composability: every context transformation carries an inverse that the runtime tracks, and both tracking and recovery preserve composition, so the context is recovered upon component removal. Reactive coeffects address local spatial composability: a component is notified against its coeffect specification whenever the context changes, each change classified as activating, deactivating, or neutral, with coeffect isolation varying what a declared key resolves to and coeffect interception varying how the binding is used. We unify the effect context and the coeffect context into a single context type, in which an observational equivalence on the coeffects supplies the effects with independence, constituting a programming paradigm for spatiotemporal composability. Combining these mechanisms into the notion of a component then gives a calculus of dynamic composition, whose metatheory carries spatiotemporal composability from a single component to a whole system of interleaved components. We realize this paradigm as the Cordis meta-framework, with a core library providing effect tracking and coeffect resolution, as well as a declarative component loader with configuration reconciliation and hot module replacement. The Koishi case study validates the design of Cordis in a production system with over 4000 community plugins.

Beyond human-curated plugin ecosystems, a compelling direction for future validation is self-evolving agent harnesses (Section 1.2.2), where an AI agent generates and replaces its own harness components continuously and with little human oversight. Applying Cordis in such a setting would validate the temporal guarantees of complete recovery under rapid component replacement, as well as the spatial guarantees of dependency coordination under frequent topological change. Such validation would demonstrate the paradigm's applicability as a foundation for recoverable, coordinated, and continuous self-evolution in agent harnesses and other autonomous systems.

</template>
<template #zh>

我们通过将效应和协效应的经典概念提升为运行时机制，为动态可组合性提出了形式基础。可逆效应解决局部时间可组合性：每个上下文变换携带运行时跟踪的逆，跟踪和恢复都保持复合，因此组件移除时上下文被恢复。反应式协效应解决局部空间可组合性：上下文变化时组件针对其协效应规格被通知，每次变化被分类为激活、去激活或中性，协效应隔离改变声明键解析到什么，协效应拦截改变绑定的使用方式。我们将效应上下文和协效应上下文统一为单一上下文类型，其中协效应上的观察等价为效应提供独立性，构成时空可组合性的编程范式。将这些机制组合为组件概念则给出动态组合的演算，其元理论将时空可组合性从单个组件推广到交错组件的整个系统。我们将此范式实现为 Cordis 元框架，核心库提供效应跟踪和协效应解析，声明式组件加载器提供配置协调和热模块替换。Koishi 案例研究在拥有超过 4000 个社区插件的生产系统中验证了 Cordis 的设计。

在人工策展的插件生态系统之外，未来验证的引人方向是自演化智能体外壳（第 1.2.2 节），其中 AI 智能体持续且在极少人类监督下生成和替换自己的外壳组件。在此场景中应用 Cordis 将验证快速组件替换下完全恢复的时间保证，以及频繁拓扑变化下依赖协调的空间保证。此验证将展示该范式作为智能体外壳和其他自主系统中可恢复、协调和持续自演化基础的适用性。

</template>
</Bilingual>

## References

<Bilingual>
<template #en>
</template>
<template #zh>
</template>
</Bilingual>

[1] D. L. Parnas, "On the criteria to be used in decomposing systems into modules," *Communications of the ACM*, vol. 15, no. 12, pp. 1053–1058, 1972.

[2] D. Birsan, "On Plug-ins and Extensible Architectures," *ACM Queue*, vol. 3, no. 2, pp. 40–46, 2005.

[3] B. Burns et al., "Borg, Omega, and Kubernetes," *Communications of the ACM*, vol. 59, no. 5, pp. 50–57, 2016.

[4] B. Stroustrup, *The Design and Evolution of C++*. Addison-Wesley, 1994.

[5] S. Marlow, S. Peyton Jones, A. Moran, and J. Reppy, "Asynchronous Exceptions in Haskell," in *PLDI '01*, 2001, pp. 274–285.

[6] L. Cardelli, "Program Fragments, Linking, and Modularization," in *POPL 1997*, ACM Press, 1997, pp. 266–277.

[7] C. Szyperski, *Component Software: Beyond Object-Oriented Programming*, 2nd ed. Addison-Wesley, 2002.

[8] R. Lopopolo, "Harness Engineering: Leveraging Codex in an Agent-First World." [Online]. Available: https://openai.com/index/harness-engineering/

[9] Anthropic, "Harness Design for Long-Running Application Development." [Online]. Available: https://www.anthropic.com/engineering/harness-design-longrunning-apps

[10] L. Wang et al., "A Survey on Large Language Model Based Autonomous Agents," *Frontiers of Computer Science*, vol. 18, no. 6, p. 186345, 2024.

[11] Y. Qin et al., "Tool Learning with Foundation Models," *ACM Computing Surveys*, 2025.

[12] C. Packer et al., "MemGPT: Towards LLMs as Operating Systems," *CoRR*, vol. abs/2310.08560, 2023.

[13] T. Guo et al., "Large Language Model Based Multi-Agents: A Survey of Progress and Challenges," in *IJCAI 2024*, pp. 8048–8057.

[14] T. Cai et al., "Large Language Models as Tool Makers," in *ICLR 2024*.

[15] J. Armstrong, "Making Reliable Distributed Systems in the Presence of Software Errors," Doctoral dissertation, 2003.

[16] E. Moggi, "Notions of computation and monads," *Information and Computation*, vol. 93, no. 1, pp. 55–92, 1991.

[17] G. Plotkin and J. Power, "Adequacy for Algebraic Effects," in *FOSSACS 2001*, Springer, pp. 1–24.

[18] T. Petricek, D. Orchard, and A. Mycroft, "Coeffects: unified static analysis of context-dependence," in *ICALP'13*, 2013, pp. 385–397.

[19] M. Gaboardi et al., "Combining effects and coeffects via grading," in *ICFP 2016*, pp. 476–489.

[20] A. Church, "A Formulation of the Simple Theory of Types," *The Journal of Symbolic Logic*, vol. 5, no. 2, pp. 56–68, 1940.

[21] B. C. Pierce, *Types and Programming Languages*. MIT Press, 2002.

[22] J. M. Lucassen and D. K. Gifford, "Polymorphic Effect Systems," in *POPL '88*, 1988, pp. 47–57.

[23] P. Wadler, "Monads for functional programming," in *Program Design Calculi*, Springer, 1993, pp. 233–264.

[24] G. Plotkin and J. Power, "Notions of Computation Determine Monads," in *FOSSACS 2002*, Springer, pp. 342–356.

[25] G. Plotkin and M. Pretnar, "Handlers of Algebraic Effects," in *ESOP 2009*, Springer, pp. 80–94.

[26] M. Pretnar, "An Introduction to Algebraic Effects and Handlers," *Electron. Notes Theor. Comput. Sci.*, vol. 319, pp. 19–35, 2015.

[27] D. Leijen, "Koka: Programming with Row Polymorphic Effect Types," *EPTCS*, vol. 153, pp. 100–126, 2014.

[28] D. Leijen, "Type directed compilation of row-typed algebraic effects," in *POPL '17*, 2017, pp. 486–499.

[29] A. Bauer and M. Pretnar, "Programming with algebraic effects and handlers," *J. LAMP*, vol. 84, no. 1, pp. 108–123, 2015.

[30] K. Sivaramakrishnan et al., "Retrofitting parallelism onto OCaml," *Proc. ACM Program. Lang.*, vol. 4, no. ICFP, 2020.

[31] T. Petricek, D. Orchard, and A. Mycroft, "Coeffects: a calculus of context-dependent computation," in *ICFP '14*, 2014, pp. 123–135.

[32] T. Uustalu and V. Vene, "Comonadic Notions of Computation," *ENTCS*, vol. 203, no. 5, pp. 263–284, 2008.

[33] A. Brunel et al., "A Core Quantitative Coeffect Calculus," in *ESOP 2014*, Springer, pp. 351–370.

[34] J. Reed and B. C. Pierce, "Distance makes the types grow stronger: a calculus for differential privacy," *SIGPLAN Not.*, vol. 45, no. 9, pp. 157–168, 2010.

[35] M. Abadi et al., "A core calculus of dependency," in *POPL '99*, 1999, pp. 147–160.

[36] D. E. Denning, "A lattice model of secure information flow," *Commun. ACM*, vol. 19, no. 5, pp. 236–243, 1976.

[37] U. Dal Lago and F. Gavazzo, "A relational theory of effects and coeffects," *Proc. ACM Program. Lang.*, vol. 6, no. POPL, 2022.

[38] M. Fowler, "Inversion of Control Containers and the Dependency Injection pattern." [Online]. Available: https://martinfowler.com/articles/injection.html

[39] A. M. Pitts and I. D. B. Stark, "Observable Properties of Higher Order Functions that Dynamically Create Local Names," in *MFCS 1993*, Springer, pp. 122–141.

[40] G. D. Plotkin, "LCF Considered as a Programming Language," *Theoretical Computer Science*, vol. 5, no. 3, pp. 223–255, 1977.

[41] D. R. Ghica, K. Muroya, and T. Waugh Ambridge, "A Robust Graph-Based Approach to Observational Equivalence," *LMCS*, vol. 21, no. 2, 2025.

[42] X. Leroy and S. Blazy, "Formal Verification of a C-like Memory Model," *J. Automated Reasoning*, vol. 41, no. 1, pp. 1–31, 2008.

[43] R. P. James and A. Sabry, "Yield: Mainstream Delimited Continuations," in *TPDC 2011*, pp. 20–32.

[44] A. W. Mazurkiewicz, "Trace Theory," in *Petri Nets 1986, Part II*, LNCS vol. 255, Springer, pp. 279–324.

[45] U. A. Acar, G. E. Blelloch, and R. Harper, "Adaptive functional programming," *ACM TOPLAS*, vol. 28, no. 6, pp. 990–1034, 2006.

[46] webpack, "Hot Module Replacement." [Online]. Available: https://webpack.js.org/api/hot-module-replacement

[47] Vite, "HMR API." [Online]. Available: https://vite.dev/guide/api-hmr

[48] E. N. Elnozahy et al., "A Survey of Rollback-Recovery Protocols in Message-Passing Systems," *ACM Computing Surveys*, vol. 34, no. 3, pp. 375–408, 2002.

[49] H. Garcia-Molina and K. Salem, "Sagas," in *SIGMOD '87*, 1987, pp. 249–259.

[50] OSGi Alliance, *OSGi Core Release 8*, 2020.

[51] J. Kramer and J. Magee, "The Evolving Philosophers Problem: Dynamic Change Management," *IEEE TSE*, vol. 16, no. 11, pp. 1293–1306, 1990.

[52] Y. Vandewoude et al., "Tranquility: A Low Disruptive Alternative to Quiescence," *IEEE TSE*, vol. 33, no. 12, pp. 856–868, 2007.

[53] J. S. Rellermeyer, G. Alonso, and T. Roscoe, "R-OSGi: Distributed Applications Through Software Modularization," in *Middleware '07*, 2007, pp. 1–20.

[54] J. B. Dennis and E. C. Van Horn, "Programming Semantics for Multiprogrammed Computations," *Commun. ACM*, vol. 9, no. 3, pp. 143–155, 1966.

[55] M. S. Miller, K.-P. Yee, and J. Shapiro, "Capability Myths Demolished," technical report SRL2003–2, 2003.

[56] R. N. M. Watson et al., "Capsicum: Practical Capabilities for UNIX," in *USENIX Security 2010*, pp. 29–46.

[57] R. Wahbe et al., "Efficient Software-Based Fault Isolation," in *SOSP '93*, 1993, pp. 203–216.

[58] A. Barth et al., "Protecting Browsers from Extension Vulnerabilities," in *NDSS '10*, 2010.

[59] W. W. Ho and R. A. Olsson, "An Approach to Genuine Dynamic Linking," *Software: Practice and Experience*, vol. 21, no. 4, pp. 375–390, 1991.

[60] P. Wadler and S. Blott, "How to Make Ad-hoc Polymorphism Less Ad Hoc," in *POPL '89*, 1989, pp. 60–76.

[61] N. D. Matsakis and F. S. K. II, "The Rust Language and Type System," in *ACM SIGPLAN ML Family Workshop*, 2014.

[62] D. Dreyer et al., "Modular Type Classes," in *POPL '07*, 2007, pp. 63–70.

[63] Microsoft, "Declaration Merging." [Online]. Available: https://www.typescriptlang.org/docs/handbook/declaration-merging.html

[64] T. Van Cutsem and M. S. Miller, "Proxies: Design Principles for Robust Object-oriented Intercession APIs," in *DLS '10*, 2010, pp. 59–72.

[65] R. Hettinger, "Descriptor HowTo Guide." [Online]. Available: https://docs.python.org/3/howto/descriptor.html

[66] P. Maes, "Concepts and Experiments in Computational Reflection," in *OOPSLA 1987*, pp. 147–155.

[67] G. Bracha and D. M. Ungar, "Mirrors: design principles for meta-level facilities," in *OOPSLA 2004*, pp. 331–344.

[68] R. Rouvoy and P. Merle, "Leveraging component-based software engineering with Fraclet," *Annals of Telecommunications*, vol. 64, no. 1–2, pp. 65–79, 2009.

[69] E. Burmako, "Scala Macros: Let Our Powers Combine!," in *SCALA@ECOOP '13*, 2013.

[70] S. Raemaekers, A. van Deursen, and J. Visser, "Semantic Versioning and Impact of Breaking Changes," *JSS*, vol. 129, pp. 140–158, 2017.

[71] P. Lam, J. Dietrich, and D. J. Pearce, "Putting the Semantics into Semantic Versioning," in *Onward! '20*, 2020, pp. 157–179.

[72] P. Abate et al., "Dependency Solving: A Separate Concern in Component Evolution Management," *JSS*, vol. 85, no. 10, pp. 2228–2240, 2012.

[73] L. Cardelli, "Structural Subtyping and the Notion of Power Type," in *POPL '88*, 1988, pp. 70–79.

[74] B. Meyer, "Applying 'Design by Contract'," *Computer*, vol. 25, no. 10, pp. 40–51, 1992.

[75] B. C. Pierce, "Bounded Quantification is Undecidable," *Information and Computation*, vol. 112, no. 1, pp. 131–165, 1994.

[76] A. Haas et al., "Bringing the web up to speed with WebAssembly," in *PLDI 2017*, pp. 185–200.

[77] M. M. Swift, B. N. Bershad, and H. M. Levy, "Improving the reliability of commodity operating systems," in *SOSP 2003*, pp. 207–222.

[78] M. M. Swift et al., "Recovering device drivers," *ACM TOCS*, vol. 24, no. 4, pp. 333–360, 2006.

[79] D. E. Porter et al., "Operating System Transactions," in *SOSP 2009*, pp. 161–176.

[80] O. Kiselyov and C.-c. Shan, "Delimited Continuations in Operating Systems," in *CONTEXT 2007*, Springer, pp. 291–302.

[81] E. Dolstra and A. Löh, "NixOS: a purely functional Linux distribution," in *ICFP 2008*, pp. 367–378.

[82] ZIO, "ZIO: Type-safe, composable asynchronous and concurrent programming for Scala." [Online]. Available: https://zio.dev/

[83] Effect, "Effect: A TypeScript library for building robust applications." [Online]. Available: https://effect.website/

[84] G. Canti, "fp-ts: Functional programming in TypeScript." [Online]. Available: https://github.com/gcanti/fp-ts

[85] J. I. Brachthäuser, P. Schuster, and K. Ostermann, "Effects as capabilities: effect handlers and lightweight effect polymorphism," *Proc. ACM Program. Lang.*, vol. 4, no. OOPSLA, 2020.

[86] J. I. Brachthäuser et al., "Effects, capabilities, and boxes: from scope-based reasoning to type-based reasoning and back," *Proc. ACM Program. Lang.*, vol. 6, no. OOPSLA1, 2022.

[87] C. Heunen, R. Kaarsgaard, and M. Karvonen, "Reversible Effects as Inverse Arrows," in *MFPS XXXIV*, *ENTCS*, vol. 341, 2018, pp. 179–199.

[88] D. Orchard, V.-B. Liepelt, and H. Eades III, "Quantitative program reasoning with graded modal types," *Proc. ACM Program. Lang.*, vol. 3, no. ICFP, 2019.

[89] R. Bianchini et al., "Coeffects for sharing and mutation," *Proc. ACM Program. Lang.*, vol. 6, no. OOPSLA2, 2022.

[90] R. Bianchini et al., "A Java-like calculus with heterogeneous coeffects," *TCS*, vol. 971, p. 114063, 2023.

[91] C. Torczon et al., "Effects and Coeffects in Call-by-Push-Value," *Proc. ACM Program. Lang.*, vol. 8, no. OOPSLA2, 2024.

[92] R. Hirschfeld, P. Costanza, and O. Nierstrasz, "Context-oriented Programming," *JOT*, vol. 7, no. 3, pp. 125–151, 2008.

[93] P. Costanza and R. Hirschfeld, "Language constructs for context-oriented programming," in *DLS '05*, 2005, pp. 1–10.

[94] G. Salvaneschi, C. Ghezzi, and M. Pradella, "Context-oriented programming: A software engineering perspective," *JSS*, vol. 85, no. 8, pp. 1801–1817, 2012.

[95] G. Kiczales et al., "Aspect-Oriented Programming," in *ECOOP'97*, LNCS vol. 1241, Springer, pp. 220–242.

[96] G. Kiczales et al., "An Overview of AspectJ," in *ECOOP 2001*, LNCS vol. 2072, Springer, pp. 327–353.

[97] A. Popovici, T. Gross, and G. Alonso, "Dynamic Weaving for Aspect-Oriented Programming," in *AOSD 2002*, pp. 141–147.

[98] J. Bonér, "What Are the Key Issues for Commercial AOP Use," in *AOSD 2004*, pp. 5–6.

[99] M. Hicks, J. T. Moore, and S. Nettles, "Dynamic Software Updating," in *PLDI '01*, 2001, pp. 13–23.

[100] G. Stoyle et al., "Mutatis Mutandis: Safe and Predictable Dynamic Software Updating," in *POPL '05*, 2005, pp. 183–194.

[101] C. M. Hayden et al., "Kitsune: Efficient, General-Purpose Dynamic Software Updating for C," *ACM TOPLAS*, vol. 36, no. 4, 2014.

[102] M. Overeem, M. Spoor, and S. Jansen, "The Dark Side of Event Sourcing: Managing Data Conversion," in *SANER '17*, 2017, pp. 193–204.

[103] E. Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley, 1994.

[104] D. Leijen, "Algebraic Effect Handlers with Resources and Deep Finalization," technical report MSR-TR-2018-10, 2018.

[105] M. Fowler, "Event Sourcing," 2005.

[106] J. Lee, J. Ahn, and K. Yi, "React-tRace: A Semantics for Understanding React Hooks," *Proc. ACM Program. Lang.*, vol. 9, no. OOPSLA2, pp. 471–498, 2025.

[107] N. Shavit and D. Touitou, "Software Transactional Memory," in *PODC '95*, 1995, pp. 204–213.

[108] T. Harris et al., "Composable Memory Transactions," in *PPoPP '05*, 2005, pp. 48–60.

[109] M. Herlihy and J. E. B. Moss, "Transactional Memory: Architectural Support for Lock-Free Data Structures," in *ISCA '93*, 1993, pp. 289–300.

[110] R. Landauer, "Irreversibility and Heat Generation in the Computing Process," *IBM J. Res. Dev.*, vol. 5, no. 3, pp. 183–191, 1961.

[111] C. H. Bennett, "Logical Reversibility of Computation," *IBM J. Res. Dev.*, vol. 17, no. 6, pp. 525–532, 1973.

[112] T. Yokoyama and R. Glück, "A Reversible Programming Language and its Invertible Self-Interpreter," in *PEPM '07*, 2007, pp. 144–153.

[113] V. Danos and J. Krivine, "Reversible Communicating Systems," in *CONCUR 2004*, LNCS vol. 3170, Springer, pp. 292–307.

[114] I. Phillips and I. Ulidowski, "Reversing Algebraic Process Calculi," in *FOSSACS 2006*, LNCS vol. 3921, Springer, pp. 246–260.

[115] P. Wadler, "Linear Types Can Change the World!," in *Programming Concepts and Methods*, North-Holland, 1990, pp. 561–581.

[116] A. Lenharth, V. S. Adve, and S. T. King, "Recovery domains: an organizing principle for recoverable operating systems," in *ASPLOS 2009*, pp. 49–60.

[117] C. Walls, *Spring in Action*, 6th ed. Manning, 2022.

[118] C. Escoffier, R. S. Hall, and P. Lalanda, "iPOJO: an Extensible Service-Oriented Component Framework," in *IEEE SCC 2007*, pp. 474–481.

[119] H. Cervantes and R. S. Hall, "Autonomous Adaptation to Dynamic Availability Using a Service-Oriented Component Model," in *ICSE '04*, 2004, pp. 614–623.

[120] C. Elliott and P. Hudak, "Functional Reactive Animation," in *ICFP '97*, 1997, pp. 263–273.

[121] G. H. Cooper and S. Krishnamurthi, "Embedding Dynamic Dataflow in a Call-by-Value Language," in *ESOP 2006*, LNCS vol. 3924, Springer, pp. 294–308.

[122] I. Maier and M. Odersky, "Deprecating the Observer Pattern with Scala.React," technical report EPFL-REPORT-176887, 2012.

[123] E. Bainomugisha et al., "A Survey on Reactive Programming," *ACM Comput. Surv.*, vol. 45, no. 4, 2013.

[124] A. Margara and G. Salvaneschi, "On the Semantics of Distributed Reactive Programming: The Cost of Consistency," *IEEE TSE*, vol. 44, no. 7, pp. 689–711, 2018.
