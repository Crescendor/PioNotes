// PioNotes - Background Service Worker

// Eklenti yüklendiğinde yan panel davranışını belirle
chrome.runtime.onInstalled.addListener(() => {
  // Eklenti ikonuna tıklandığında yan paneli aç
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => {
      console.log("Yan panel tıklama davranışı başarıyla etkinleştirildi.");
    })
    .catch((error) => {
      console.error("Yan panel davranışı ayarlanırken hata oluştu:", error);
    });
});

console.log("PioNotes background worker başlatıldı.");
