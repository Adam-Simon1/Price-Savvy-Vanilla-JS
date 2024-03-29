// Starts after the html document is completely loaded and ready to go
document.addEventListener("DOMContentLoaded", function () {
  // Importing all the elements
  const inputField = document.getElementById("inputField");
  const textArea = document.getElementById("list-field");
  const returnButton = document.getElementById("button-input");
  const suggestionsContainer = document.querySelector(
    ".autocomplete-suggestions"
  );
  const priceH1 = document.getElementById("price-h1");
  const priceH1Child = priceH1.querySelector("span");
  const applyChangesButton = document.getElementById("apply-changes");
  const allCheckbox = document.getElementById("all");
  const dropdownOptions = document.querySelectorAll(".dropdown-content a");
  const resetBtn = document.getElementById("resetbtn");

  let kauflandArray;
  let tescoArray;
  let autocompleteData;

  if (Cookies.get("priceCookie") == undefined) {
    Cookies.set("priceCookie", 0, { expires: 1 });
  }

  if(!Cookies.get("textareaCookie")){
    localStorage.clear();
  }

  const sendOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  };

  fetch("/autocomplete-data", sendOptions)
    .then((response) => response.json())
    .then((data) => {
      //console.log(data);
      kauflandArray = JSON.parse(data.kauflandArray);
      tescoArray = JSON.parse(data.tescoArray);
    });

  // Dropdown menu value
  let selectedValue;
  dropdownOptions.forEach((option) => {
    option.addEventListener("click", function (event) {
      event.preventDefault();
      selectedValue = this.getAttribute("data-value");
    });
  });

  // Listens for Select All checkbox to be checked
  allCheckbox.addEventListener("change", function (event) {
    checkAll();
  });

  //
  resetBtn.addEventListener("click", function (event) {
    const checkboxes = document.querySelectorAll('input[name="checkbox"]');
    autocompleteData;
    for (var i = 0; i < checkboxes.length; i++) {
      checkboxes[i].checked = false;
      allCheckbox.checked = false;
    }
    location.reload();
  });

  // Calling applyChanges() function after pressing the button
  applyChangesButton.addEventListener("click", function (event) {
    applyChanges();
    console.log(autocompleteData);

    // Showing autocomplete suggestions
    inputField.addEventListener("input", function (event) {
      const inputText = removeDiacritics(this.value);
      const suggestions = getAutocompleteSuggestions(
        inputText,
        autocompleteData
      );

      // Rendering the suggestions
      renderSuggestions(suggestions);
    });
    var totalPrice = 0;
    // After clicking on a suggestion, it is added to a text area, and the input is cleared
    suggestionsContainer.addEventListener("click", function (event) {
      if (event.target.classList.contains("autocomplete-suggestion")) {
        const selectedSuggestion = event.target.innerText;
        const currentText = textArea.value;

        if (currentText.includes(selectedSuggestion)) {
          return; // Skip adding duplicate suggestion
        }
        const newText = currentText
          ? currentText + "\n" + selectedSuggestion
          : selectedSuggestion;
        textArea.value = newText;
        suggestionsContainer.innerHTML = "";
        inputField.value = "";

        // Adding up price
        const newestText = textArea.value;
        const lines = newestText.split("\n");
        lastItem = lines[lines.length - 1];
        const priceSplit = lastItem.split(";");
        const price = priceSplit[1];
        const modifiedPrice = price.replace(",", ".");
        const modifiedPriceInt = parseFloat(modifiedPrice, 10);
        totalPrice += modifiedPriceInt;
        totalPrice = Math.round((totalPrice + Number.EPSILON) * 100) / 100;
        Cookies.set("priceCookie", totalPrice, { expires: 1 });
        priceH1Child.textContent = "";
        priceH1Child.textContent = totalPrice + " €";
      }
    });

    // Price cookie, retrieves the last displayed price after refreshing
    const cookie = Cookies.get("priceCookie");
    const cookieInt = parseFloat(cookie, 10);
    if (cookieInt !== 0) {
      priceH1Child.textContent = cookie + " €";
      totalPrice = cookieInt;
    }

    // A return button that removes the latest added product
    returnButton.addEventListener("click", function (event) {
      // Subtracting price of a removed item
      const currentText = textArea.value;
      const lines = currentText.split("\n");
      const lastItem = lines[lines.length - 1];
      const priceSplit = lastItem.split(";");
      const price = priceSplit[1];
      const modifiedPrice = price.replace(",", ".");
      const modifiedPriceInt = parseFloat(modifiedPrice, 10);
      totalPrice -= modifiedPriceInt;
      totalPrice = Math.round((totalPrice + Number.EPSILON) * 100) / 100;
      priceH1Child.textContent = totalPrice + " €";
      Cookies.set("priceCookie", totalPrice, { expires: 1 });

      // Removes last product after pressing the return button
      lines.pop(); // Remove the last line
      textArea.value = lines.join("\n");
    });
  });

  // Select All button functionality
  function checkAll() {
    const checkboxes = document.querySelectorAll('input[name="checkbox"]');
    if (allCheckbox.checked == true) {
      for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = true;
      }
    } else if (allCheckbox.checked == false) {
      for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = false;
      }
    }
  }

  // After checking a certain checkbox it modifies the csvFiles array
  function applyChanges() {
    const kauflandCheckbox = document.getElementById("kaufland");
    const tescoCheckbox = document.getElementById("tesco");

    // Adding into array if the checkboxes are checked
    if (tescoCheckbox.checked == true && kauflandCheckbox.checked == true) {
      autocompleteData = kauflandArray.concat(tescoArray);
    } else if (kauflandCheckbox.checked == true) {
      autocompleteData = kauflandArray;
    } else if (tescoCheckbox.checked == true) {
      autocompleteData = tescoArray;
    }

    // Removing from array if the checkboxes arent checked
    if (tescoCheckbox.checked == false && kauflandCheckbox.checked == false) {
      autocompleteData;
    } else if (tescoCheckbox.checked == false) {
      autocompleteData = kauflandArray;
    } else if (kauflandCheckbox.checked == false) {
      autocompleteData = tescoArray;
    }
  }

  // Function that filters and sorts the suggestions based on price
  function getAutocompleteSuggestions(inputText, autocompleteData) {
    const inputWords = removeDiacritics(inputText.toLowerCase()).split(" ");
    const matchingSuggestions = autocompleteData.filter((suggestion) => {
      if (suggestion) {
        const suggestionWords = removeDiacritics(
          suggestion.toLowerCase()
        ).split(" ");
        return inputWords.every((inputWord) =>
          suggestionWords.some((suggestionWord) =>
            suggestionWord.startsWith(inputWord)
          )
        );
      }
      return false;
    });

    // Sort the suggestions based on price (ascending order)
    const sortedSuggestions = matchingSuggestions.sort((a, b) => {
      const priceA = parseFloat(a.split(";")[1].replace(",", ".").trim());
      const priceB = parseFloat(b.split(";")[1].replace(",", ".").trim());
      let ranking = priceA - priceB;

      return ranking;
    });

    return sortedSuggestions;
  }

  // Function used to render all the suggestions into the roll down window
  function renderSuggestions(suggestions) {
    suggestionsContainer.innerHTML = "";

    if (suggestions.length > 0) {
      suggestions.forEach((suggestion) => {
        const suggestionElement = document.createElement("div");
        suggestionElement.classList.add("autocomplete-suggestion");
        suggestionElement.textContent = suggestion;
        suggestionsContainer.appendChild(suggestionElement);
      });
      suggestionsContainer.style.display = "block";
    } else {
      suggestionsContainer.style.display = "none";
    }
  }

  // Function to remove diacritics from a string
  function removeDiacritics(text) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
});
