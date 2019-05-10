Object.values(document.getElementsByClassName("footer-button")).forEach(
  button =>
    button.addEventListener(
      "click",
      () => (document.getElementById("settings-radio").checked = true)
    )
);
