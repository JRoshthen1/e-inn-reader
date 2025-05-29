<template>
  <button class="styles-button" :class="{stylesButtonActive: isOpen}" @click="toggleStylesModal">
    <div class="styles-button-bar-1"></div>
    <div class="styles-button-bar-2"></div>
    <div class="styles-button-bar-3"></div>
    <div class="styles-button-bar-4"></div>
  </button>
</template>

<script>
export default {
  name: 'StylesButton',
  
  props: {
    isOpen: {
      type: Boolean,
      default: false
    }
  },
  
  methods: {
    toggleStylesModal() {
      this.$emit('toggle')
    }
  }
}
</script>

<style scoped>
.styles-button {
  color: var(--accent-color);
  transition: transform ease-in 0.3s;
  background: none;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  height: 32px;
  width: 32px;
  outline: none;
  position: absolute;
  top: 6px;
  right: 6px;
}

.styles-button > div {
  position: absolute;
  left: 20%;
  width: 60%;
  height: 0;
  border-width: 2px 0 0 0;
  border-color: var(--accent-color);
  transition: all 0.3s ease;
}
.styles-button .styles-button-bar-1 {
  top: 30%;
  border-style: solid;
}
.styles-button .styles-button-bar-2 {
  top: 42.5%;
  border-style: dashed;
}
.styles-button .styles-button-bar-3 {
  top: 57.5%;
  border-style: solid;
}
.styles-button .styles-button-bar-4 {
  top: 70%;
  border-style: dotted;
}
.stylesButtonActive .styles-button-bar-1 {
  top: 50%;
  transform: rotate(45deg);
}
.stylesButtonActive .styles-button-bar-2, 
.stylesButtonActive .styles-button-bar-4 {
  opacity: 0;
}
.stylesButtonActive .styles-button-bar-3 {
  top: 50%;
  transform: rotate(-45deg);
}
</style>
