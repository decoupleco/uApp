<script>
  let { label = 'Counter' } = $props();
  let n = $state(0);
</script>

<p class="eyebrow">{label}</p>
<p class="d">Svelte 5 island · count <span class="pill">{n}</span></p>
<button class="btn" onclick={() => n++}>Increment</button>
