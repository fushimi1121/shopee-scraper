document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('firebase').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://console.firebase.google.com/project/semiauto-shopee-tracker/firestore/databases/-default-/data/~2Fproducts'
    });
  });
});
