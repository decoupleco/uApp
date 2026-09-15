// Tier 3 Svelte 5 island. Adopts: clear + mount in one task, so the swap never paints an intermediate frame.
import { mount } from 'svelte';
import Demo2 from './Demo2.svelte';
export default (el, props) => { el.replaceChildren(); mount(Demo2, { target: el, props }); };
