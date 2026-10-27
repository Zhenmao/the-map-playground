import { debounce } from "./utils.js";

export default function initMapInputs(form) {
  const defaults = {
    baseMap: "standard",
    symbolShape: "square",
    symbolPosition: "avoidOverlapping",
    symbolSize: 60,
  };

  // Map inputs consist of three groups of radio buttons and a pair of linked number input and range input

  ///////////////////////////////////////////////////////////
  //// Elements /////////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  const symbolSizeNumberInput = form.querySelector("#symbolSizeNumberInput");
  const symbolSizeRangeInput = form.querySelector("#symbolSizeRangeInput");

  ///////////////////////////////////////////////////////////
  //// Sync URL /////////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  function syncInputs() {
    const params = new URLSearchParams(window.location.search);

    Array.from(form.elements).forEach((input) => {
      if (!input.name) return;
      const value = params.get(input.name) || defaults[input.name];
      if (input.type === "radio") {
        input.checked = value === input.value;
      } else {
        input.value = value;
      }
    });
  }

  function syncURL() {
    const params = new URLSearchParams();
    Array.from(form.elements).forEach((input) => {
      if (!input.name) return;
      if (input.type === "radio") {
        if (input.checked) params.set(input.name, input.value);
      } else {
        params.set(input.name, input.value);
      }
    });

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }

  ///////////////////////////////////////////////////////////
  //// Event handling ///////////////////////////////////////
  ///////////////////////////////////////////////////////////
  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  const debouncedHandleInput = debounce(handleInput, 200);

  form.addEventListener("input", (event) => {
    const target = event.target;
    if (target === symbolSizeNumberInput) {
      const min = Number(target.min);
      const max = Number(target.max);
      if (Number.isNaN(target.valueAsNumber)) return;
      if (target.valueAsNumber < min) {
        symbolSizeRangeInput.value = min;
      } else if (target.valueAsNumber > max) {
        symbolSizeRangeInput.value = max;
      } else {
        symbolSizeRangeInput.value = target.value;
      }
      debouncedHandleInput();
    } else if (target === symbolSizeRangeInput) {
      symbolSizeNumberInput.value = target.value;
      debouncedHandleInput();
    } else {
      handleInput();
    }
  });

  function handleInput() {
    syncURL();
    dispatchSelectedChange();
  }

  function dispatchSelectedChange() {
    const selected = {};
    Array.from(form.elements).forEach((input) => {
      if (!input.name) return;
      if (input.type === "radio") {
        if (input.checked) selected[input.name] = input.value;
      } else {
        selected[input.name] = input.valueAsNumber;
      }
    });
    form.dispatchEvent(
      new CustomEvent("selectedchange", {
        detail: selected,
      }),
    );
  }

  ///////////////////////////////////////////////////////////
  //// Initialization ///////////////////////////////////////
  ///////////////////////////////////////////////////////////
  syncInputs();
  syncURL();
  dispatchSelectedChange();
}
