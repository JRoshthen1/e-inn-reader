<template>
  <div>
    <div v-for="(item, index) in toc" :key="index">
      <button
        :class="[
          'toc-area-button',
          item.href === current ? 'active' : '',
        ]"
        @click="handleClick(item)"
      >
        <span v-if="isSubmenu" class="submenu-indent">{{ item.label }}</span>
        <span v-else>{{ item.label }}</span>
        <div 
          v-if="item.subitems.length > 0"
          :class="['expansion', { 'open': item.expansion }]"
        ></div>
      </button>
      
      <!-- Nested TOC -->
      <Transition name="collapse-transition">
        <div 
          v-if="item.subitems.length > 0" 
          v-show="item.expansion"
        >
          <TocComponent
            :toc="item.subitems"
            :current="current"
            :setLocation="setLocation"
            :isSubmenu="true"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  toc: {
    type: Array,
    required: true
  },
  current: {
    type: [String, Number],
    default: null
  },
  setLocation: {
    type: Function,
    required: true
  },
  isSubmenu: {
    type: Boolean,
    default: false
  }
});

// Handle item click
const handleClick = (item) => {
  if (item.subitems && item.subitems.length > 0) {
    // Toggle expansion and navigate, but don't close TOC
    item.expansion = !item.expansion;
    props.setLocation(item.href, false);
  } else {
    // No subitems, just navigate and close TOC
    props.setLocation(item.href);
  }
};
</script>
<style>
/* TOC area styles */
.toc-area {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 10;
  width: 256px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 6px 0;
  background-color: var(--background-color);
  border-right: 1px solid var(--divider-color);
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
}

.toc-area::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.toc-area::-webkit-scrollbar-thumb:vertical {
  height: 5px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
}

.toc-area .toc-area-button {
  user-select: none;
  appearance: none;
  background: none;
  border: none;
  display: block;
  font-family: sans-serif;
  width: 100%;
  font-size: 0.9em;
  text-align: left;
  padding: 0.9em 1em;
  border-bottom: 1px solid var(--divider-color);
  color: var(--text-color);
  box-sizing: border-box;
  outline: none;
  cursor: pointer;
  position: relative;
}

.toc-area .toc-area-button:hover {
  background: rgba(0, 0, 0, 0.05);
}

.toc-area .toc-area-button:active {
  background: rgba(0, 0, 0, 0.1);
}

.toc-area .active {
  border-left: 3px solid var(--accent-color);
}

.toc-area .toc-area-button .expansion {
  cursor: pointer;
  transform: translateY(-50%);
  top: 50%;
  right: 12px;
  position: absolute;
  width: 10px;
  background-color: #a2a5b4;
  transition: top 0.3s ease-in-out;
}

.toc-area .toc-area-button .expansion::after,
.toc-area .toc-area-button .expansion::before {
  content: "";
  position: absolute;
  width: 6px;
  height: 2px;
  background-color: currentcolor;
  border-radius: 2px;
  transition: transform 0.3s ease-in-out, top 0.3s ease-in-out;
}

.toc-area .toc-area-button .expansion::before {
  transform: rotate(-45deg) translateX(2.5px);
}
.toc-area .toc-area-button .open::before {
  transform: rotate(45deg) translateX(2.5px);
}
.toc-area .toc-area-button .expansion::after {
  transform: rotate(45deg) translateX(-2.5px);
}
.toc-area .toc-area-button .open::after {
  transform: rotate(-45deg) translateX(-2.5px);
}

/* TOC background overlay */
.toc-background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 5;
}
</style>
