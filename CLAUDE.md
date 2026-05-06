## Context Efficiency
### Subagent Discipline

Prefer inline work for tasks under ~5 tool calls. Subagents have overhead â€” don't delegate trivially.
When using subagents, include output rules: "Final response under 2000 characters. List outcomes, not process."
Never call TaskOutput twice for the same subagent. If it times out, increase the timeout â€” don't re-read.

### File Reading
Read files with purpose. Before reading a file, know what you're looking for.
Use Grep to locate relevant sections before reading entire large files.
Never re-read a file you've already read in this session.
For files over 500 lines, use offset/limit to read only the relevant section.

### Responses
Don't echo back file contents you just read â€” the user can see them.
Don't narrate tool calls ("Let me read the file..." / "Now I'll edit..."). Just do it.
Keep explanations proportional to complexity. Simple changes need one sentence, not three paragraphs.

For markdown tables, use the minimum valid separator (`|-|-|` â€” one hyphen per column). Never use repeated hyphens (`|---|---|`), box-drawing characters (`â”€`), or padded separators. This saves tokens.