---
title: Understanding mini-swe-agent
date: 2026-06-12
summary: An overview of the mini-swe-agent and its design principles.
tags:
  - Agent Design
  - Software Engineering
---

# Understanding mini-swe-agent

对 mini-swe-agent 的源码阅读和理解，主要目的是：

1. 宏观来看，实现一个 agent 需要做哪些封装？整体的架构思路是什么？

2. 微观来看，怎么控制 llm 的输出？agent 的执行流程应该怎么拆解？...

## Overview

`AGENTS.md`：

```bash
minisweagent/__init__  # Protocols/interfaces for all base classes
minisweagent/agents  # Agent control flow & loop
minisweagent/environments  # Executing agent actions
minisweagent/models  # LM interfaces
minisweagent/run  # Run scripts that serve as an entry point
```

我们自顶向下的研究 mini-swe-agent 的设计，首先从 `run` 目录开始。

## /run

主要看 `/run/hello_world.py`：

```python
@app.command()
def main(
    task: str = typer.Option(..., "-t", "--task", help="Task/problem statement", show_default=False, prompt=True),
    model_name: str = typer.Option(
        os.getenv("MSWEA_MODEL_NAME"),
        "-m",
        "--model",
        help="Model name (defaults to MSWEA_MODEL_NAME env var)",
        prompt="What model do you want to use?",
    ),
) -> DefaultAgent:
    logging.basicConfig(level=logging.DEBUG)
    agent = DefaultAgent(
        LitellmModel(model_name=model_name),
        LocalEnvironment(),
        **yaml.safe_load(Path(package_dir / "config" / "default.yaml").read_text())["agent"],
    )
    agent.run(task)
    return agent
```

使用 typer 定义了一个命令行接口，接受两个参数：`task` 和 `model_name`。其中 `task` 是一个必填项，用户需要输入任务或问题陈述；`model_name` 则可以通过环境变量 `MSWEA_MODEL_NAME` 提供默认值，如果没有设置环境变量，则会提示用户输入模型名称。

使用 `DefaultAgent` 类创建了一个 agent 实例，传入了一个 `LitellmModel` 实例和一个 `LocalEnvironment` 实例，以及从配置文件 `/config/default.yaml` 中加载的 agent 配置。最后调用 `agent.run(task)` 来执行任务。

查看 `/config/default.yaml`，可以看到配置文件的 `agent` 部分包括下面这些内容，由于篇幅限制不贴出完整的提示词内容：

```yaml
agent:
  system_template: |
    系统提示词，包括：
    - 角色设定：You are a helpful assistant that can interact with a computer.
    - 输出格式：Your response must contain exactly ONE bash code block with ONE command; Include a THOUGHT section before your command where you explain your reasoning process... 还提供了一个 <format_example> 块来说明输出格式
  instance_template: |
    实例提示词，包括：
    - 当前任务：Please solve this issue: {{task}}; You can execute bash commands and edit files to implement the necessary changes.
    - 推荐工作流：## Recommended workflow... 提供了一个推荐工作流，内容包括
      - 分析代码库找出和 issue 相关的代码：Analyze the codebase by finding and reading relevant files
      - 复现 issue 来确认问题：Create a script to reproduce the issue
      - 修复 issue：Edit the source code to resolve the issue
      - 验证修复：Verify your fix works by running your script again
      - 确保修复的健壮性：Test edge cases to ensure your fix is robust
      - 提交修复
    - 重要规则：## Important Rules...
      - 每个回答都必须包含一个 action：Every response must contain exactly one action
      - 每个 action 都必须被包含在 triple backticks 中：Every action must be enclosed in triple backticks
      - 每个 action 都在一个新的 subshell 中，路径等环境不会被保留：Directory or environment variable changes are not persistent. Every action is executed in a new subshell.
    - 系统信息：<system_information>
    - 输出格式：用一个 <example_response> 举例说明输出格式，内容包括：
      - THOUGHT：分析问题的思路
      - ```mswea_bash_command```：要执行的命令，必须包含在 triple backticks 中
    - 有用的案例：
      - 创建新的文件
      - 使用 sed 命令修改文件
      - 查看文件内容
  step_limit: 0
  cost_limit: 0
```

## /agents

主要看 `/agent/default.py`：

```python
class AgentConfig(BaseModel):
    """Check the config files in minisweagent/config for example settings."""

    system_template: str
    """Template for the system message (the first message)."""
    instance_template: str
    """Template for the first user message specifying the task (the second message overall)."""
    step_limit: int = 0
    """Maximum number of steps the agent can take."""
    cost_limit: float = 3.0
    """Stop agent after exceeding (!) this cost."""
    wall_time_limit_seconds: int = 0
    """Stop agent after this many seconds of wall-clock time. 0 means no limit."""
    max_consecutive_format_errors: int = 3
    """Exit after this many format errors in a row (0 = no limit)."""
    output_path: Path | None = None
    """Save the trajectory to this path."""
```

使用 Pydantic BaseModel 定义了一个 `AgentConfig` 类，用于验证和管理 agent 的配置。

```python
def __init__(self, model: Model, env: Environment, *, config_class: type = AgentConfig, **kwargs):
    """See the `AgentConfig` class for permitted keyword arguments."""
    self.config = config_class(**kwargs)
    self.messages: list[dict] = []
    self.model = model
    self.env = env
    self.extra_template_vars = {}
    self.logger = logging.getLogger("agent")
    self.cost = 0.0
    self.n_calls = 0
    self.n_consecutive_format_errors = 0
    self._start_time = time.time()
```

`__init__` 方法是 DefaultAgent 的构造函数，接受一个模型实例、一个环境实例，以及从 `/config` 中读取的配置参数。

```python
def run(self, task: str = "", **kwargs) -> dict:
    """Run step() until agent is finished. Returns dictionary with exit_status, submission keys."""
    self.extra_template_vars |= {"task": task, **kwargs}
    self.messages = []
    self.add_messages(
        self.model.format_message(role="system", content=self._render_template(self.config.system_template)),
        self.model.format_message(role="user", content=self._render_template(self.config.instance_template)),
    )
    while True:
        try:
            self.step()
            self.n_consecutive_format_errors = 0  # reset on any clean step
        except FormatError as e:
            self.n_consecutive_format_errors += 1
            if 0 < self.config.max_consecutive_format_errors <= self.n_consecutive_format_errors:
                self.add_messages(
                    *e.messages,
                    {
                        "role": "exit",
                        "content": "RepeatedFormatError",
                        "extra": {"exit_status": "RepeatedFormatError", "submission": ""},
                    },
                )
            else:
                self.add_messages(*e.messages)
        except InterruptAgentFlow as e:
            self.add_messages(*e.messages)
        except Exception as e:
            self.handle_uncaught_exception(e)
            raise
        finally:
            self.save(self.config.output_path)
        if self.messages[-1].get("role") == "exit":
            break
    return self.messages[-1].get("extra", {})
```

`run` 方法是 DefaultAgent 的主方法。`extra_template_vars` 在上面 `/run/hello_world.py` 中被赋值了 `{"task": task}`，在辅助函数 `_render_template` 中被用来渲染提示词模板。函数 `recursive_merge` 的作用是将多个字典合并成一个字典，后面的字典会覆盖前面字典中相同的键，在这里被用来合并 agent 的配置、环境变量、模型变量以及一些统计信息，最终生成一个包含所有必要信息的字典，用于渲染提示词模板。

```python
def get_template_vars(self, **kwargs) -> dict:
    return recursive_merge(
        self.config.model_dump(),
        self.env.get_template_vars(),
        self.model.get_template_vars(),
        {
            "n_model_calls": self.n_calls,
            "model_cost": self.cost,
            "elapsed_seconds": int(time.time() - self._start_time),
        },
        self.extra_template_vars,
        kwargs,
    )

def _render_template(self, template: str) -> str:
    return Template(template, undefined=StrictUndefined).render(**self.get_template_vars())
```

`self.messages` 是一个列表，用于存储 agent 的对话历史。`message` 是一个字典，包含 `role`、`content` 和 `extra` 三个键。`role` 表示消息的角色，可以是 "system"、"user" 等；`content` 是消息的内容；`extra` 是一个可选的字段，用于存储额外的信息，其具体作用后续再讲解。

`while True` 是 agent 主循环。每次调用 `self.step()` 来执行 agent 的一步操作，如果过程中发生 `FormatError` 或 `InterruptAgentFlow` 异常，则会捕获并处理这些异常，最后检查最新的消息是否是一个 "exit" 消息，如果是则退出循环。

`step` 是对一次对话步骤的封装方法。由于 DefaultAgent 不考虑与人的交互，因此一次对话步骤仅包括查询模型 `query` 和执行动作 `execute_actions`：

```python
def step(self) -> list[dict]:
    """Query the LM, execute actions."""
    return self.execute_actions(self.query())

def query(self) -> dict:
    """Query the model and return model messages. Override to add hooks."""
    if 0 < self.config.step_limit <= self.n_calls or 0 < self.config.cost_limit <= self.cost:
        raise LimitsExceeded(
            {
                "role": "exit",
                "content": "LimitsExceeded",
                "extra": {"exit_status": "LimitsExceeded", "submission": ""},
            }
        )
    if 0 < self.config.wall_time_limit_seconds <= int(time.time() - self._start_time):
        raise TimeExceeded(
            {
                "role": "exit",
                "content": "TimeExceeded",
                "extra": {"exit_status": "TimeExceeded", "submission": ""},
            }
        )
    self.n_calls += 1
    message = self.model.query(self.messages)
    self.cost += message.get("extra", {}).get("cost", 0.0)
    self.add_messages(message)
    return message

def execute_actions(self, message: dict) -> list[dict]:
    """Execute actions in message, add observation messages, return them."""
    outputs = [self.env.execute(action) for action in message.get("extra", {}).get("actions", [])]
    return self.add_messages(*self.model.format_observation_messages(message, outputs, self.get_template_vars()))
```

`query` 方法负责查询模型，首先检查是否超过了步骤数、成本或时间的限制，如果超过则抛出相应的异常。然后调用模型 `model` 的 `query` 方法，传入当前的消息历史，获取模型的响应消息，并将其添加到消息历史中。`execute_actions` 方法负责执行模型响应中的动作，首先从消息的 `extra` 字段中提取出要执行的动作列表，然后调用环境 `env` 的 `execute` 方法来执行每个动作，并将工具的执行结果通过 `format_observation_messages` 方法格式化后，作为一条新的 `message` 追加到消息列表中。

综上所述，agent 层的主要职责包括：

1. 主对话循环的控制权：通过 `run` 方法实现对主循环的控制，处理异常并决定何时退出循环。步数、费用和时间限制的实现也是在这一层中完成的。同时，agent 层从 model 层获取格式化的模型响应消息，并将其作为输入传递给 environment 层来执行相应的动作，然后将工具执行的结果格式化为新的消息并添加到消息历史中。

2. 对话历史的管理：通过 `self.messages` 维护 agent 的对话历史。

3. 提示词的渲染和管理：系统提示词模板定义了 agent 的角色设定、输出格式等全局信息；实例提示词模板则包含了当前任务、推荐工作流、重要规则、系统信息以及输出格式示例等与具体任务相关的信息。这两部分提示词是作为 agent 层的配置参数传入的。同时 agent 通过 `_render_template` 方法渲染系统提示词和实例提示词。

4. 状态持久化：通过 `save` 方法将 agent 的完整历史保存到指定路径。

同时，我们还遗留了几个问题：

1. `message` 的 `extra` 字段目前看起来包含工具调用请求 `actions` ，是否还包含其他类型的信息？换句话说，`extra` 的具体定义是什么？

2. `query`、`format_observation_messages`、`execute` 方法的实现细节是什么？

## /models

主要看 `/models/litellm_model.py`。litellm 库支持用统一的接口调用所有 LLM API。

```python
class LitellmModelConfig(BaseModel):
    model_name: str
    """Model name. Highly recommended to include the provider in the model name, e.g., `anthropic/claude-sonnet-4-5-20250929`."""
    model_kwargs: dict[str, Any] = {}
    """Additional arguments passed to the API."""
    litellm_model_registry: Path | str | None = os.getenv("LITELLM_MODEL_REGISTRY_PATH")
    """Model registry for cost tracking and model metadata. See the local model guide (https://mini-swe-agent.com/latest/models/local_models/) for more details."""
    set_cache_control: Literal["default_end"] | None = None
    """Set explicit cache control markers, for example for Anthropic models"""
    cost_tracking: Literal["default", "ignore_errors"] = os.getenv("MSWEA_COST_TRACKING", "default")
    """Cost tracking mode for this model. Can be "default" or "ignore_errors" (ignore errors/missing cost info)"""
    format_error_template: str = "{{ error }}"
    """Template used when the LM's output is not in the expected format."""
    observation_template: str = (
        "{% if output.exception_info %}<exception>{{output.exception_info}}</exception>\n{% endif %}"
        "<returncode>{{output.returncode}}</returncode>\n<output>\n{{output.output}}</output>"
    )
    """Template used to render the observation after executing an action."""
    multimodal_regex: str = ""
    """Regex to extract multimodal content. Empty string disables multimodal processing."""
```

`LitellmModelConfig` 定义了 `LitellmModel` 的配置参数，包括模型名称、模型参数、成本统计、提示词模板（LLM 返回错误格式时的提示词、工具调用结果提示词）等。

```python
def query(self, messages: list[dict[str, str]], **kwargs) -> dict:
    for attempt in retry(logger=logger, abort_exceptions=self.abort_exceptions):
        with attempt:
            response = self._query(self._prepare_messages_for_api(messages), **kwargs)
    cost_output = self._calculate_cost(response)
    GLOBAL_MODEL_STATS.add(cost_output["cost"])
    # Note: all model.query() implementations must persist the response on FormatError.
    try:
        actions = self._parse_actions(response)
    except FormatError as e:
        try:
            e.messages[0]["extra"]["response"] = response.model_dump(mode="json")
        except Exception:
            # model_dump failed (e.g. unserializable object); fall back to repr
            # so the spec contract ("response MUST be persisted") holds unconditionally.
            e.messages[0]["extra"]["response"] = repr(response)
        raise
    message = response.choices[0].message.model_dump()
    message["extra"] = {
        "actions": actions,
        "response": response.model_dump(),
        **cost_output,
        "timestamp": time.time(),
    }
    return message
```

`query` 方法是 `LitellmModel` 的核心方法。不难看到主要的失败重试循环是通过 `retry` 方法实现的。结合 `self.abort_exceptions` 的定义和 `retry` 方法的实现来研究 `retry` 方法。`abort_exceptions` 定义了在调用模型 API 时需要立即中止重试的异常类型列表，包括一些 litellm 定义的异常类型以及 `KeyboardInterrupt`。

```python
abort_exceptions: list[type[Exception]] = [
    litellm.exceptions.UnsupportedParamsError,
    litellm.exceptions.NotFoundError,
    litellm.exceptions.PermissionDeniedError,
    litellm.exceptions.ContextWindowExceededError,
    litellm.exceptions.AuthenticationError,
    KeyboardInterrupt,
]

def retry(*, logger: logging.Logger, abort_exceptions: list[type[Exception]]) -> Retrying:
    """Thin wrapper around tenacity.Retrying to make use of global config etc.

    Args:
        logger: Logger to use for reporting retries
        abort_exceptions: Exceptions to abort on.

    Returns:
        A tenacity.Retrying object.
    """
    return Retrying(
        reraise=True,
        stop=stop_after_attempt(int(os.getenv("MSWEA_MODEL_RETRY_STOP_AFTER_ATTEMPT", "10"))),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        retry=retry_if_not_exception_type(tuple(abort_exceptions)),
    )
```

`retry` 方法使用了 tenacity 库来实现失败重试机制，返回一个 `Retrying` 对象，参数包括：重试全部耗尽后重新抛出最后一次异常、最多尝试 10 次、指数退避、重试前 log 一次 WARNING、如果不是 `abort_exceptions` 中定义的异常类型则进行重试。

回到 `query` 方法。`_prepare_messages_for_api` 方法首先剥离 `message` 中的 `extra` 字段；Anthropic API 要求 thinking 块必须排在其他块前面，因此通过 `_reorder_anthropic_thinking_blocks` 做了一次重排（其他 LLM API 没有 role = thinking，所以这个操作不会产生任何影响）；`set_cache_control` 同样是针对 Anthropic 模型的一个特殊处理，设置了 cache control 的标记以便后续进行缓存控制。`_query` 方法是对 `litellm.completion` 的一次封装，注意到参数 `tools` 只传入了一个 `BASH_TOOL`。

```python
def _query(self, messages: list[dict[str, str]], **kwargs):
    try:
        return litellm.completion(
            model=self.config.model_name,
            messages=messages,
            tools=[BASH_TOOL],
            **(self.config.model_kwargs | kwargs),
        )
    except litellm.exceptions.AuthenticationError as e:
        e.message += " You can permanently set your API key with `mini-extra config set KEY VALUE`."
        raise e

def _prepare_messages_for_api(self, messages: list[dict]) -> list[dict]:
    prepared = [{k: v for k, v in msg.items() if k != "extra"} for msg in messages]
    prepared = _reorder_anthropic_thinking_blocks(prepared)
    return set_cache_control(prepared, mode=self.config.set_cache_control)
```

之后 `retry` 进行用量统计，然后尝试通过辅助方法 `_parse_actions` 从模型的响应中解析 action。

```python
def _parse_actions(self, response) -> list[dict]:
    """Parse tool calls from the response. Raises FormatError if unknown tool."""
    tool_calls = response.choices[0].message.tool_calls or []
    return parse_toolcall_actions(
        tool_calls,
        format_error_template=self.config.format_error_template,
        template_kwargs={"finish_reason": response.choices[0].finish_reason},
    )

def parse_toolcall_actions(
    tool_calls: list, *, format_error_template: str, template_kwargs: dict | None = None
) -> list[dict]:
    """Parse tool calls from the response. Raises FormatError if unknown tool or invalid args.

    ``template_kwargs`` are extra variables exposed to ``format_error_template`` (e.g.
    ``{"finish_reason": ...}`` so a template can distinguish a real format mistake from a
    ``max_tokens`` truncation).
    """
    template_kwargs = template_kwargs or {}
    if not tool_calls:
        raise FormatError(
            {
                "role": "user",
                "content": Template(format_error_template, undefined=StrictUndefined).render(
                    error="No tool calls found in the response. Every response MUST include at least one tool call.",
                    actions=[],
                    **template_kwargs,
                ),
                "extra": {"interrupt_type": "FormatError"},
            }
        )
    actions = []
    for tool_call in tool_calls:
        error_msg = ""
        args = {}
        try:
            args = json.loads(tool_call.function.arguments)
        except Exception as e:
            error_msg = f"Error parsing tool call arguments: {e}."
        if tool_call.function.name != "bash":
            error_msg += f"Unknown tool '{tool_call.function.name}'."
        if not isinstance(args, dict) or "command" not in args:
            error_msg += "Missing 'command' argument in bash tool call."
        if error_msg:
            raise FormatError(
                {
                    "role": "user",
                    "content": Template(format_error_template, undefined=StrictUndefined).render(
                        actions=[], error=error_msg.strip(), **template_kwargs
                    ),
                    "extra": {"interrupt_type": "FormatError"},
                }
            )
        actions.append({"command": args["command"], "tool_call_id": tool_call.id})
    return actions
```

有一个令人比较疑惑的点是，在之前的 `/config/default.yaml` 中，系统提示词明确要求模型的输出必须包含一个 triple backticks 来执行命令，那么为什么在这里还要进行一次工具调用解析，并且如果没有找到工具调用就抛出 `FormatError` 呢？这是因为 `LitellmModel` 的设计是面向支持工具调用（会返回 `tool_calls` 字段）的模型的，而 `LitellmTextBasedModel` 中模型使用纯文本输出命令，因此会用正则 `r"```mswea_bash_command\s*\n(.*?)\n```"` 提取工具调用。

函数 `parse_toolcall_actions` 的作用是从模型的响应中解析出工具调用，首先检查是否存在工具调用，如果没有则抛出 `FormatError`；然后对于每个工具调用，尝试解析其参数，如果解析失败或者工具名称不正确或者缺少必要参数，则构造一个错误消息并抛出 `FormatError`；如果解析成功，则将工具调用转换为一个包含命令和工具调用 ID 的字典，并添加到返回的动作列表中。

最后 `query` 方法将解析出的动作列表以及其他相关信息（如成本、时间戳等）添加到消息的 `extra` 字段中，总共包含以下信息：

- `actions`：从模型响应中解析出的工具调用列表，每个工具调用包含要执行的命令和工具调用 ID。
- `response`：模型的完整原始响应数据，格式为 JSON。
- `cost`：本次模型调用的成本。
- `timestamp`：模型调用完成的时间戳。

这些信息被向上传递给 agent 层。

另一个我们关心的函数是 `format_observation_messages`，它的作用是将工具调用的执行结果格式化为新的消息，以便在 agent 的对话历史中进行记录和后续的模型输入。

```python
def format_observation_messages(
    self, message: dict, outputs: list[dict], template_vars: dict | None = None
) -> list[dict]:
    """Format execution outputs into tool result messages."""
    actions = message.get("extra", {}).get("actions", [])
    return format_toolcall_observation_messages(
        actions=actions,
        outputs=outputs,
        observation_template=self.config.observation_template,
        template_vars=template_vars,
        multimodal_regex=self.config.multimodal_regex,
    )

def format_toolcall_observation_messages(
    *,
    actions: list[dict],
    outputs: list[dict],
    observation_template: str,
    template_vars: dict | None = None,
    multimodal_regex: str = "",
) -> list[dict]:
    """Format execution outputs into tool result messages."""
    not_executed = {"output": "", "returncode": -1, "exception_info": "action was not executed"}
    padded_outputs = outputs + [not_executed] * (len(actions) - len(outputs))
    results = []
    for action, output in zip(actions, padded_outputs):
        content = Template(observation_template, undefined=StrictUndefined).render(
            output=output, **(template_vars or {})
        )
        msg = {
            "content": content,
            "extra": {
                "raw_output": output.get("output", ""),
                "returncode": output.get("returncode"),
                "timestamp": time.time(),
                "exception_info": output.get("exception_info"),
                **output.get("extra", {}),
            },
        }
        if "tool_call_id" in action:
            msg["tool_call_id"] = action["tool_call_id"]
            msg["role"] = "tool"
        else:
            msg["role"] = "user"  # human issued commands
        if multimodal_regex:
            msg = expand_multimodal_content(msg, pattern=multimodal_regex)
        results.append(msg)
    return results
```

默认版本的 `observation_template` 不会对输出做截断，仅考虑了工具的异常、返回码和输出内容。在 `/config/default.yaml` 的提示词模板中则考虑了输出过长的情况。

综上所述，models 层的主要职责包括：

1. LLM API 调用和失败重试：通过 `query` 方法实现对 LLM API 的调用，并使用 `retry` 方法实现失败重试机制，处理各种可能的异常情况。

2. 与对话结果强相关的提示词管理：提供了 `format_error_template` 和 `observation_template` 两个提示词模板，分别用于模型输出格式错误时的提示词和工具调用结果的提示词。

3. 消息解析：通过 `_parse_actions` 方法从模型的响应中解析出工具调用，并将其作为动作列表返回，通过 `format_observation_messages` 方法对工具调用的执行结果进行格式化，生成新的消息。

4. 费用计算：通过 `_calculate_cost` 方法计算模型调用的费用，并将其添加到消息的 `extra` 字段中。

## /environments

主要看 `/environments/local.py`：

```python
def execute(self, action: dict, cwd: str = "", *, timeout: int | None = None) -> dict[str, Any]:
    """Execute a command in the local environment and return the result as a dict."""
    command = action.get("command", "")
    cwd = cwd or self.config.cwd or os.getcwd()
    try:
        result = subprocess.run(
            command,
            shell=True,
            text=True,
            cwd=cwd,
            env=os.environ | self.config.env,
            timeout=timeout or self.config.timeout,
            encoding="utf-8",
            errors="replace",
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        output = {"output": result.stdout, "returncode": result.returncode, "exception_info": ""}
    except Exception as e:
        raw_output = getattr(e, "output", None)
        raw_output = (
            raw_output.decode("utf-8", errors="replace") if isinstance(raw_output, bytes) else (raw_output or "")
        )
        output = {
            "output": raw_output,
            "returncode": -1,
            "exception_info": f"An error occurred while executing the command: {e}",
            "extra": {"exception_type": type(e).__name__, "exception": str(e)},
        }
    self._check_finished(output)
    return output
```

核心方法是 `execute`：它接收一个 `{"command": "ls -la"}` 这样的 action，通过 `subprocess.run()` 在本地机器上执行这条 bash 命令，然后把结果打包成标准化的字典返回。

注意几个关键设计：`shell=True` 让命令走 bash 解释，所以管道、重定向、&& 连接都能用；`stderr=subprocess.STDOUT` 把标准错误合并到标准输出，这样 agent 只需看一个 output 字段；`errors="replace"` 确保遇到非法 UTF-8 字节时不会崩溃，而是用替换字符占位；`env=os.environ | self.config.env` 继承系统环境变量的同时，允许通过配置覆盖或追加特定变量（比如 YAML 里设了 `PAGER: cat` 来防止 less 进交互模式）。工作目录的解析是三级回退：优先用调用时传的 cwd 参数，其次用配置里的 `self.config.cwd`，最后用 `os.getcwd()` 取当前目录。

每次命令执行完，`_check_finished()` 会检查输出的第一行是不是 `COMPLETE_TASK_AND_SUBMIT_FINAL_OUTPUT`——这是 `default.md` 里教 LLM 的收尾指令。如果 LLM 执行了 `echo COMPLETE_TASK_AND_SUBMIT_FINAL_OUTPUT`，environment 不会把这条输出当普通 observation 返回，而是直接抛出 Submitted 异常，中断 agent 的循环。输出从第二行开始的内容会被当作最终提交结果，在上述提示词下这应该是空。

综上所述，environment 层的主要职责是：

1. 执行 agent 发出的命令：通过 `execute` 方法接收包含命令的 action 字典，在本地环境中执行该命令，并将执行结果（包括输出、返回码和异常信息）以标准化的格式返回。

2. 监控任务完成信号：通过 `_check_finished` 方法检查工具调用的输出中是否包含预定义的完成信号（如 `COMPLETE_TASK_AND_SUBMIT_FINAL_OUTPUT`），如果检测到该信号，则抛出 `Submitted` 异常以中断 agent 的主循环，标志着任务的完成。

## Summary

回到开头提出的两个问题。

宏观来看，实现一个 agent 需要四层封装：入口层（run）负责组装实例和加载配置，编排层（agents）负责循环控制和异常调度，对话层（models）负责 LLM 交互和输出解析，执行层（environments）负责命令执行和状态监控。每一层只关心自己的职责，通过 Protocol 接口和多态实现可替换性——换成 Docker 环境只需替换 Environment 实现，换成 text-based 模型只需替换 Model 实现。微观来看，控制 LLM 输出靠两层约束：prompt 层面通过模板教 LLM 输出格式（tool-calling 的 BASH_TOOL 定义或 text-based 的 triple backticks 约定），代码层面通过 _parse_actions 严格校验输出格式并在出错时生成纠错反馈。agent 的执行流程是线性的——每一步都是"问 LLM → 解析动作 → 执行命令 → 格式化结果 → 追加历史"的循环，直到异常或信号触发终止。