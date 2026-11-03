# skills · 可复用技能包

这里放**与具体项目无关**的工作方法，可整包复制到任何 agent 的技能目录。

| 技能 | 解决什么 | 入口 |
|---|---|---|
| `product-manager/` | 把模糊需求变成可直接开发的契约；文档治理；优先级与状态汇报 | [SKILL.md](product-manager/SKILL.md) |

## 怎么用

**给 agent（两种都行）**

1. 把 `product-manager/` 整个目录放进对方的 skills 目录（Claude / DSH / Cursor 等一般认 `SKILL.md` + `references/`）。
2. 或者不装技能，直接把 `SKILL.md` 作为系统提示词的一段贴进去；`references/` 按需在追问时加载。

**给自己**

- 接需求前翻 `SKILL.md` 的「触发器」表：先确认用户真正在要什么。
- 被说"文档太乱/太啰嗦/跑偏了"时，直接看 `references/anti-patterns.md` 的「症状」列对症。
- 写交付物时用 `references/templates.md` 的四个模板，别现编。

## 维护

- 一个技能一个目录，`SKILL.md` 只写"何时用 + 铁律 + 流程 + 触发器"，细节放 `references/`。
- 新增反模式先写症状，再写根因，最后写纠正；写不出根因的，多半是偶发问题，不用收。
- 版本记在 `SKILL.md` 顶部注释里，改一次加一行。

## 边界

技能里只放**方法**。项目专属的数字、字段、阈值、路径，留在项目文档里——否则技能就不能复用了。
