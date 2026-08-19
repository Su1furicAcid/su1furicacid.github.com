---
title: CMU 15-779 04-Transformers, Attention, and FlashAttention
date: 2026-08-13
summary: Notes for CMU 15-779 04-Transformers, Attention, and FlashAttention
tags:
  - MLSys
---

# 04 Transformers, Attention, and FlashAttention

![alt text](<04-Transformers, Attention, and FlashAttention/image.png>)

注意力机制的核心是加权求和。

![alt text](<04-Transformers, Attention, and FlashAttention/image-1.png>)

原始的 Transformer 论文面向翻译任务，~~我个人认为~~重点是 Self-Attention、Multi-Head Attention 两个机制和 Encoder-Decoder 的整体架构。这两个机制也是接下来讨论的重点。

![alt text](<04-Transformers, Attention, and FlashAttention/image-2.png>)

![alt text](<04-Transformers, Attention, and FlashAttention/image-3.png>)

![alt text](<04-Transformers, Attention, and FlashAttention/image-4.png>)

![alt text](<04-Transformers, Attention, and FlashAttention/image-5.png>)

Self-Attention 描述了这样的过程：用户输入了一句话，模型会把这句话拆分成若干 token，通过 token ID 映射到若干 embedding。这若干 embedding 会乘上权重矩阵 $W_Q, W_K, W_V$，得到 Query、Key、Value 三个向量。Query 和 Key 之间的点积可以得到一个注意力分数（Attention Score），这个分数经过 Softmax 归一化后，作为 Value 的加权系数，最终得到输出。除以 $\sqrt{d_k}$ 能够让注意力分数的方差为 1，同时保护 Softmax 的输出概率分布。

![alt text](<04-Transformers, Attention, and FlashAttention/image-6.png>)

![alt text](<04-Transformers, Attention, and FlashAttention/image-7.png>)

Multi-Head Attention 将 Self-Attention 的过程重复了 $h$ 次，每次使用不同的权重矩阵 $W_Q^i, W_K^i, W_V^i$，得到 $h$ 个输出。然后将这 $h$ 个输出拼接起来，乘上一个权重矩阵 $W^O$，得到最终的输出。直观上，多个头把完整的语言表示空间切成多个子空间。不同"头"可以关注不同的语言现象。

现有的生成式语言模型主要采用 Decoder-Only 架构。在 Decoder-Only 架构中，推理过程天然分为两个阶段：Prefill 阶段把输入的 prompt 处理成 Key、Value，生成第一个 token；Decode 阶段把前面生成的 token 作为输入，继续生成下一个 token，这个推理过程是自回归的。

![alt text](<04-Transformers, Attention, and FlashAttention/image-8.png>)

图中展示了一个朴素的 $Z = \text{Softmax}(\frac{QK^T}{\sqrt{d_k}})V$ 的计算过程，主要有三个挑战：

- 庞大的中间结果：$QK^T$ 的中间结果是一个 $N \times N$ 的矩阵，$N$ 是序列长度。对于长序列，$N$ 很大，这个中间结果会占用大量显存。
- 重复的内存访问：数据会反复在 Shared Memory 和 Global Memory 之间传输，导致性能下降。
- 不可扩展性：复杂度是 $O(N^2)$。

![alt text](<04-Transformers, Attention, and FlashAttention/image-9.png>)

![alt text](<04-Transformers, Attention, and FlashAttention/image-10.png>)

Flash Attention 的目的是解决内存 IO 带来的性能问题（并非对 Attention 机制本身做轻量化改造），核心思想是按块（Block）计算注意力分数和加权求和。两个主要的技术：

- Tiling：分块重构计算过程。
- Recomputation：在计算过程中，舍弃中间结果，按需重新计算。

![alt text](<04-Transformers, Attention, and FlashAttention/image-11.png>)

1. 不把整个 Q,K,V 留在 HBM 里做计算，而是切成橙色的 Block，按需搬运到 SRAM。
2. 对于加载进来的 $Q_i$ 和 $K_j^T$，直接在片上算出局部注意力分数 $Q_iK_j^T$，紧接着做局部的 softmax 和与 $V_j$ 的加权，得到该块对最终输出的局部贡献。
3. 因为 softmax 是全局归一化操作，单独对这个子块做 softmax 得到的归一化系数是"局部"的，不是全局正确的。因此，每处理一个新块，必须通过一个 scaling 操作，把之前累积的中间结果按新的统计量（全局最大值、全局指数和）重新校正，再写入 HBM 中的输出。

![alt text](<04-Transformers, Attention, and FlashAttention/image-12.png>)

Safe Softmax 用于避免上溢风险；Online Softmax 则是处理上面提到的局部归一化问题。只要维护当前见过的最大值 $m$ 和按当前最大值修正后的指数和 $l$，当新数据块到来时，就可以用指数缩放因子 $e^{m_{old} - m_{new}}$ 把旧统计量修正到新的全局基准下，再与新块的局部统计量相加。

![alt text](<04-Transformers, Attention, and FlashAttention/image-13.png>)

Flash Attention-2 的算法如上。

> **Require:** Matrices $\mathbf{Q}, \mathbf{K}, \mathbf{V} \in \mathbb{R}^{N \times d}$ in HBM, block sizes $B_c, B_r$.
> 
> 1: Divide $\mathbf{Q}$ into $T_r = \lceil \frac{N}{B_r} \rceil$ blocks $\mathbf{Q}_1, \dots, \mathbf{Q}_{T_r}$ of size $B_r \times d$ each, and divide $\mathbf{K}, \mathbf{V}$ in to $T_c = \lceil \frac{N}{B_c} \rceil$ blocks $\mathbf{K}_1, \dots, \mathbf{K}_{T_c}$ and $\mathbf{V}_1, \dots, \mathbf{V}_{T_c}$, of size $B_c \times d$ each.
>
> Not a source quote

- $Q$ 按**行**切成 $T_r$ 块（每块 $B_r$ 个 query），因为输出 $O$ 也是按 query 的行方向对应。
- $K, V$ 按**行**切成 $T_c$ 块（每块 $B_c$ 个 key/value），因为 Attention 的本质是 query 与所有 key 交互。
- 所有原始数据一开始都在**慢速的 HBM** 里。

> 3: **for** $1 \leq i \leq T_r$ **do**
> 4: $\quad$ Load $\mathbf{Q}_i$ from HBM to on-chip SRAM.
> 5: $\quad$ On chip, initialize $\mathbf{O}_i^{(0)} = (0)_{B_r \times d}$, $\boldsymbol{\ell}_i^{(0)} = (0)_{B_r}$, $\mathbf{m}_i^{(0)} = (-\infty)_{B_r}$.
>
> Not a source quote

**外层循环**遍历每个 query 块 $\mathbf{Q}_i$。把 $\mathbf{Q}_i$ 加载到 SRAM 后，算法在片上为该块初始化三个**运行状态（running states）**：

| 状态 | 维度 | 含义 |
|------|------|------|
| $\mathbf{O}_i^{(j)}$ | $B_r \times d$ | **未归一化的输出累加器**。里面存的是截至第 $j$ 个 $K/V$ 块为止，加权 $\mathbf{V}$ 的累加和（还未除以最终的 softmax 分母）。 |
| $\boldsymbol{\ell}_i^{(j)}$ | $B_r$ | **修正后的指数和累加器**。截至当前见过的所有 key 块，按全局最大值调整后的 $\sum e^{s - m}$。 |
| $\mathbf{m}_i^{(j)}$ | $B_r$ | **当前见过的全局最大值**。每一行（每个 query）单独维护一个最大值，因为 softmax 是按行归一化的。 |

初始值 $-\infty$ 和 $0$ 是 Online Softmax 的哨兵值：任何数与 $-\infty$ 取 max 都会让位给新数据，指数和从 0 开始累加。

> 6: $\quad$ **for** $1 \leq j \leq T_c$ **do**
> 7: $\quad\quad$ Load $\mathbf{K}_j, \mathbf{V}_j$ from HBM to on-chip SRAM.
> 8: $\quad\quad$ On chip, compute $\mathbf{S}_i^{(j)} = \mathbf{Q}_i \mathbf{K}_j^\top \in \mathbb{R}^{B_r \times B_c}$.
>
> Not a source quote

内层循环遍历所有 key/value 块。每次只从 HBM 取**一个** $\mathbf{K}_j$ 和一个 $\mathbf{V}_j$ 到 SRAM，与已经驻留在 SRAM 的 $\mathbf{Q}_i$ 做矩阵乘，得到局部注意力分数矩阵 $\mathbf{S}_i^{(j)}$。

注意：这个 $\mathbf{S}_i^{(j)}$ 尺寸只有 $B_r \times B_c$（例如 64×64），而不是完整的 $N \times N$。它只在 SRAM 中存在，**不会被写回 HBM**。

> 9: $\quad\quad$ On chip, compute $\mathbf{m}_i^{(j)} = \max(\mathbf{m}_i^{(j-1)}, \text{rowmax}(\mathbf{S}_i^{(j)})) \in \mathbb{R}^{B_r}$, $\tilde{\mathbf{P}}_i^{(j)} = \exp(\mathbf{S}_i^{(j)} - \mathbf{m}_i^{(j)}) \in \mathbb{R}^{B_r \times B_c}$ (pointwise), $\boldsymbol{\ell}_i^{(j)} = e^{\mathbf{m}_i^{(j-1)} - \mathbf{m}_i^{(j)}} \boldsymbol{\ell}_i^{(j-1)} + \text{rowsum}(\tilde{\mathbf{P}}_i^{(j)}) \in \mathbb{R}^{B_r}$.

这是算法的**数学心脏**，对应前面讲的 Online Softmax 合并公式：

1. **更新全局最大值**：把上一个循环的 $\mathbf{m}_i^{(j-1)}$ 与新块 $\mathbf{S}_i^{(j)}$ 的每行最大值比较，得到截至目前的真实全局最大值 $\mathbf{m}_i^{(j)}$。
2. **计算局部未归一化概率** $\tilde{\mathbf{P}}_i^{(j)}$：用**新的全局最大值**去减，保证指数始终 $\leq 0$，既数值安全（Safe Softmax），又确保新旧块在同一基准下。
3. **修正并累加指数和** $\boldsymbol{\ell}_i^{(j)}$：旧的 $\boldsymbol{\ell}_i^{(j-1)}$ 是相对于 $\mathbf{m}_i^{(j-1)}$ 计算的，现在基准变成了更大的（或相等的）$\mathbf{m}_i^{(j)}$，所以必须乘以缩放因子 $e^{\mathbf{m}_i^{(j-1)} - \mathbf{m}_i^{(j)}}$ 才能加到新的统计量上。这就是讲义里讲的：
   > $\ell(x) = e^{m(x^{(1)}) - m(x)} \ell(x^{(1)}) + e^{m(x^{(2)}) - m(x)} \ell(x^{(2)})$

> 10: $\quad\quad$ On chip, compute $\mathbf{O}_i^{(j)} = \text{diag}(e^{\mathbf{m}_i^{(j-1)} - \mathbf{m}_i^{(j)}})^{-1} \mathbf{O}_i^{(j-1)} + \tilde{\mathbf{P}}_i^{(j)} \mathbf{V}_j$.

**输出累加器的同步更新。** $\mathbf{O}_i^{(j-1)}$ 里面存的是之前所有 $K/V$ 块对输出贡献的累加和，但这些贡献是在**旧最大值 $\mathbf{m}_i^{(j-1)}$ 的基准**下计算的。如果新块带来了更大的最大值，旧贡献的"权重"相对变小了，必须同样乘以 $e^{\mathbf{m}_i^{(j-1)} - \mathbf{m}_i^{(j)}}$ 进行修正，再加上新块 $\tilde{\mathbf{P}}_i^{(j)} \mathbf{V}_j$ 的贡献。

这里的 $\text{diag}(\cdot)^{-1}$ 左乘，本质上是对 $\mathbf{O}_i^{(j-1)}$ 的每一行做逐元素标量乘法（因为每个 query 有独立的 running max）。


> 12: $\quad$ On chip, compute $\mathbf{O}_i = \text{diag}(\boldsymbol{\ell}_i^{(T_c)})^{-1} \mathbf{O}_i^{(T_c)}$.

内层循环结束后，$\mathbf{O}_i^{(T_c)}$ 是所有 $K/V$ 块加权求和后的**未归一化**结果，分母是累计的指数和 $\boldsymbol{\ell}_i^{(T_c)}$。除以它（逐行），才是真正的 softmax 归一化输出。

> 13: $\quad$ On chip, compute $\mathbf{L}_i = \mathbf{m}_i^{(T_c)} + \log(\boldsymbol{\ell}_i^{(T_c)})$.

这一步计算 **logsumexp**。它把每行的 running max 和 running sum 合并成一个标量：
$$\text{logsumexp}(\mathbf{s}) = \max(s) + \log \sum_i e^{s_i - \max(s)}$$

**为什么要存 $\mathbf{L}_i$？** 这正是 FlashAttention 第二项核心技术 **Recomputation（重计算）** 的关键：

> By storing softmax normalization factors from forward (size N), recompute attention in the backward from inputs in shared memory

前向传播不保存巨大的 $N \times N$ 注意力矩阵 $\mathbf{P}$，只保存每个位置的 logsumexp $\mathbf{L}$（仅 $O(N)$ 空间）。反向传播时，利用 $\mathbf{Q}, \mathbf{K}, \mathbf{V}$ 和 $\mathbf{L}$，可以在 SRAM 中**重新实时算出 softmax 矩阵**，从而计算梯度。这比从 HBM 读取存下来的 $\mathbf{P}$ 快得多，也省得多。

> 14: $\quad$ Write $\mathbf{O}_i$ to HBM as the $i$-th block of $\mathbf{O}$.
> 15: $\quad$ Write $\mathbf{L}_i$ to HBM as the $i$-th block of $\mathbf{L}$.

最后，把归一化好的输出块 $\mathbf{O}_i$ 和辅助统计量 $\mathbf{L}_i$ 写回 HBM。整个过程中：
- **读 HBM**：各一次的 $\mathbf{Q}_i, \mathbf{K}_j, \mathbf{V}_j$（总共约 $O(N)$ 次传输）
- **写 HBM**：最终的 $\mathbf{O}_i$ 和 $\mathbf{L}_i$
- **从未写回 HBM 的**：任何 $N \times N$ 的中间注意力矩阵

![alt text](<04-Transformers, Attention, and FlashAttention/image-14.png>)

Recomputation 用于解决反向传播时的内存占用问题：

$$\frac{\partial L}{\partial V} = P^T \cdot \frac{\partial L}{\partial O}$$

其中 $P = softmax(\mathbf{Q} \cdot \mathbf{K}^T)$ 是注意力分数矩阵。一般实现的做法是，在前向传播计算出 $P$ 后，把它存到 HBM 里，反向传播时直接读取 $P$ 来计算梯度。但 $P$ 是一个 $N \times N$ 的矩阵，对于长序列，显存占用巨大。Recomputation 的做法是，前向传播的时候不保存完整的注意力矩阵 $P$，只保存每行的 softmax 归一化因子（logsumexp），反向传播时再用对应的 $\mathbf{Q}, \mathbf{K}, \mathbf{V}$ 块和 logsumexp 重新计算 $P$，从而计算梯度。

效果是 GFLOPS 虽然增加，但是 Runtime 却显著下降。

![alt text](<04-Transformers, Attention, and FlashAttention/image-15.png>)

前面解决了单个 thread block 内部如何用 Tiling 和 Online Softmax 在 SRAM 上高效计算；现在我们考虑怎么把这么多 thread block 组织起来。

1. 不同 head 可以直接映射到不同 thread block，典型 Transformer 有 16–64 个 head，可以直接利用数十个 SM。
2. head 数量不足以填满所有 SM，需要在同一个 head 内部继续切分。此时选择按 Query 切分：每个 thread block 被分配负责一部分 query 行，该 block 把分到的 ​$Q_i$ 加载到 SRAM 后，顺序遍历所有的 Key/Value 块（$K_j,V_j$），用 Online Softmax 在本地维护 running max 和 running sum。处理完所有 K/V 后，该 block 即可独立完成 softmax 归一化，把属于自己的那部分输出写回 HBM。

之所以不能按 K/V 切分，是因为 softmax 的归一化是按行（Query）进行的，每个 Query 的 softmax 分母是所有 Key 的加权和。如果按 K/V 切分，不同 block 之间无法通信，就无法得到正确的归一化结果。

![alt text](<04-Transformers, Attention, and FlashAttention/image-16.png>)

GPU 会自动管理 Block 的调度，因此无需关心不同 Block 之间的不平衡问题。

![alt text](<04-Transformers, Attention, and FlashAttention/image-17.png>)

Flash Attention 2 相比 Flash Attention 1，更强调把 query 作为并行维度。在之前的 Flash Attention 1 的实现中，要得到全局正确的归一化结果，不同 warp 之间必须通过 shared memory 做跨 warp 的 reduce 操作，warp 之间要等大家都算完局部值才能继续；而在 Flash Attention 2 中，每个 warp 负责计算自己那几行 query 的完整 attention，由于不同 query 行在 softmax 上完全独立，因此不需要跨 warp 的 reduce 操作，warp 之间可以完全独立地并行计算。

![alt text](<04-Transformers, Attention, and FlashAttention/image-18.png>)

![alt text](<04-Transformers, Attention, and FlashAttention/image-19.png>)

![alt text](<04-Transformers, Attention, and FlashAttention/image-20.png>)

![alt text](<04-Transformers, Attention, and FlashAttention/image-21.png>)

在 Decoder-Only 的架构上，prefill 阶段的 KV 可以被缓存起来，避免每次重复运算，decode 阶段只需要计算新生成的 token 对应的 Q 与缓存的 K/V 做 attention，然后把新的 K/V 追加到缓存即可，也就是 KV Cache。

![alt text](<04-Transformers, Attention, and FlashAttention/image-22.png>)

在 prefill 阶段仍然可以使用前面的 Flash Attention 方法，然而在 decode 阶段，由于每次只生成一个 token，Q 只有一行，因此不再能直接使用 Flash Attention。

![alt text](<04-Transformers, Attention, and FlashAttention/image-23.png>)

Flash Decoding：

1. 把 K/V 分成若干个块；
2. 对这些块通过 Flash Attention 的方法做并行地计算，也就是把每个 KV 块当作一个小型的 Flash Attention 任务来处理；
3. 合并这些块的结果，得到最终的输出。

![alt text](<04-Transformers, Attention, and FlashAttention/image-24.png>)