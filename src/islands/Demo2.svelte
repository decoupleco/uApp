<script>
  let { items: initial = ['Initiated', 'Proved', 'Settled'] } = $props();
  let items = $state(initial);
  let draft = $state('');
  const add = () => { if (draft.trim()) { items = [...items, draft.trim()]; draft = ''; } };
</script>

<p class="eyebrow">Checklist</p>
<ul class="stack">
  {#each items as it, i (it + i)}
    <li class="row"><span class="pill">{i + 1}</span><span>{it}</span></li>
  {/each}
</ul>
<input class="field" bind:value={draft} placeholder="Add a step" onkeydown={e => e.key === 'Enter' && add()} />
