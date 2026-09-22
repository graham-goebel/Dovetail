/* Meridian — the content the page renders.

   Kept apart from the page so the page is layout and behaviour only. Nothing here knows
   about Dovetail; it is the payload a CMS would hand over. */
window.MV_DATA = (function () {
  var PHOTO = "img/photo/", SCENE = "img/scene/", TEX = "img/texture/", ICON = "img/icon/";

  /* The twelve painted marks, with the words they stand for. Used in the amenity grid
     and inline in a listing's detail. */
  var AMENITIES = {
    suitcase: { label: "Luggage transfer", note: "Bags moved from the station or airport." },
    lounger: { label: "Sun terrace", note: "Loungers, shade and towels, set out daily." },
    parasol: { label: "Beach kit", note: "Parasol, cool bag and two beach chairs." },
    signpost: { label: "Guided walks", note: "Marked routes from the door, with notes." },
    coffee: { label: "Morning coffee", note: "Beans from the nearest roaster, and a grinder." },
    towel: { label: "Fresh linen", note: "Changed mid-stay, longer stays twice." },
    laptop: { label: "Fast wifi", note: "Fibre, with a desk that faces something worth seeing." },
    pasta: { label: "Welcome dinner", note: "Cooked in the house on your first night." },
    map: { label: "Local itinerary", note: "Written by the host, not by an algorithm." },
    bicycle: { label: "Bikes included", note: "Two touring bikes, helmets and locks." },
    lantern: { label: "Evening terrace", note: "Lit and laid, for the hour after sunset." },
    door: { label: "Private entrance", note: "The whole house, and the key in a box." }
  };

  var COLLECTIONS = [
    { id: "coastal", label: "Coastal", scene: SCENE + "amalfi.webp", places: "Amalfi · Aegean · Andaman", blurb: "Houses on cliffs, with the sea for a garden." },
    { id: "mountain", label: "Mountain", scene: SCENE + "alpine.webp", places: "Tahoe · Dolomites · Banff", blurb: "Timber, glass and a lake that mirrors it." },
    { id: "city", label: "City", scene: SCENE + "rome.webp", places: "Rome · Lisbon · Seville", blurb: "Terraces above the rooftops, in the old quarters." },
    { id: "tropics", label: "Tropics", scene: SCENE + "tropical.webp", places: "Koh Yao · Zanzibar · Nosy Be", blurb: "Thatch, warm water and nowhere to be." },
    { id: "wild", label: "Wild", scene: SCENE + "lakehouse.webp", places: "Bled · Lofoten · Patagonia", blurb: "Far enough out that the sky does the lighting." }
  ];

  var STAYS = [
    {
      id: "oliveto", name: "Casa Oliveto", place: "Val d'Orcia, Italy", collection: "countryside",
      collectionLabel: "Countryside", rate: 410, rating: 4.94, reviews: 128,
      guests: 6, beds: 3, baths: 2, hero: PHOTO + "tuscany.webp",
      gallery: [PHOTO + "tuscany.webp", TEX + "fields.webp"],
      galleryLabels: ["The breakfast terrace", "The valley from above"],
      blurb: "A stone farmhouse above the olive terraces, with breakfast laid outside before the heat arrives.",
      story: "Built in 1740 and in the same family since, Casa Oliveto keeps its original vaulted kitchen and adds nothing louder than a long table under the pergola. The vineyard below belongs to the neighbours, who will pour you something at six if you walk down.",
      amenities: ["pasta", "coffee", "bicycle", "map", "door", "towel"],
      host: "Giulia", tags: ["Olive harvest in October", "Two-night minimum"], featured: true
    },
    {
      id: "serrata", name: "Villa Serrata", place: "Amalfi Coast, Italy", collection: "coastal",
      collectionLabel: "Coastal", rate: 680, rating: 4.89, reviews: 96,
      guests: 4, beds: 2, baths: 2, hero: PHOTO + "amalfi.webp",
      gallery: [PHOTO + "amalfi.webp", SCENE + "amalfi.webp", TEX + "delta.webp"],
      galleryLabels: ["The pool at midday", "The house, drawn", "The coast from above"],
      blurb: "An infinity pool cut into the cliff, and a bougainvillea arch that frames the whole bay.",
      story: "Forty steps down from the coast road and then nothing but water. The house sleeps four in two rooms, both facing the sea, and the kitchen opens onto the terrace so dinner never really happens indoors.",
      amenities: ["lounger", "parasol", "coffee", "lantern", "towel", "door"],
      host: "Matteo", tags: ["Boat mooring nearby", "Adults preferred"]
    },
    {
      id: "trastevere", name: "Attico Trastevere", place: "Rome, Italy", collection: "city",
      collectionLabel: "City", rate: 395, rating: 4.86, reviews: 212,
      guests: 4, beds: 2, baths: 1, hero: PHOTO + "rome.webp",
      gallery: [PHOTO + "rome.webp", SCENE + "rome.webp", TEX + "patchwork.webp"],
      galleryLabels: ["The terrace doors", "The apartment, drawn", "The city from above"],
      blurb: "A top-floor apartment with a terrace that looks straight down the river to the dome.",
      story: "Five flights up, no lift, and worth every one. The terrace is the room you will use: olive trees in pots, a table for four, and the bells at seven. The market is two streets away and open before you are.",
      amenities: ["laptop", "coffee", "map", "signpost", "towel", "door"],
      host: "Chiara", tags: ["Walk to everything", "Fifth floor, no lift"]
    },
    {
      id: "aframe", name: "The A-Frame", place: "Lake Tahoe, United States", collection: "mountain",
      collectionLabel: "Mountain", rate: 520, rating: 4.97, reviews: 74,
      guests: 5, beds: 2, baths: 2, hero: PHOTO + "alpine.webp",
      gallery: [PHOTO + "alpine.webp", SCENE + "alpine.webp", TEX + "delta.webp"],
      galleryLabels: ["The deck at the water", "The cabin, drawn", "The lake from above"],
      blurb: "Glass to the ridgeline, a fire pit on the deck, and the lake close enough to swim before coffee.",
      story: "A 1968 A-frame taken back to the timber and rebuilt with a wall of glass facing the water. The stove is the heating and it is enough. Snowshoes in the winter, a canoe in the summer, both already there.",
      amenities: ["lantern", "coffee", "signpost", "towel", "laptop", "door"],
      host: "Rowan", tags: ["Wood stove", "Canoe included"], featured: true
    },
    {
      id: "sonora", name: "Casa Sonora", place: "Joshua Tree, United States", collection: "desert",
      collectionLabel: "Desert", rate: 340, rating: 4.81, reviews: 158,
      guests: 4, beds: 2, baths: 2, hero: PHOTO + "desert.webp",
      gallery: [PHOTO + "desert.webp", TEX + "dunes.webp"],
      galleryLabels: ["The pool at golden hour", "The dunes from above"],
      blurb: "Lime plaster, a shaded pergola and a pool that holds the last of the light.",
      story: "The house faces the boulders rather than the road, so the only thing outside the window is the desert changing colour. Nights are cold and the blankets know it. The sky here is the reason people come back.",
      amenities: ["lounger", "parasol", "coffee", "lantern", "map", "door"],
      host: "Nina", tags: ["Stargazing deck", "Pool heated to 28°C"]
    },
    {
      id: "palmreef", name: "Palm & Reef", place: "Koh Yao Noi, Thailand", collection: "tropics",
      collectionLabel: "Tropics", rate: 295, rating: 4.92, reviews: 61,
      guests: 2, beds: 1, baths: 1, hero: SCENE + "tropical.webp",
      gallery: [SCENE + "tropical.webp", TEX + "delta.webp"],
      galleryLabels: ["The villa, drawn", "The reef from above"],
      blurb: "A thatched villa a barefoot walk from the water, with a plunge pool under the palms.",
      story: "The island has no traffic worth the name. Long-tail boats leave from the beach at the end of the path, and the reef starts about thirty strokes out. Breakfast is fruit, and it arrives whenever you surface.",
      amenities: ["parasol", "lounger", "towel", "coffee", "map", "door"],
      host: "Anong", tags: ["Illustrated preview", "Photography in March"], illustrated: true
    },
    {
      id: "timber", name: "Timber & Steam", place: "Lake Bled, Slovenia", collection: "wild",
      collectionLabel: "Wild", rate: 275, rating: 4.9, reviews: 43,
      guests: 4, beds: 2, baths: 1, hero: SCENE + "lakehouse.webp",
      gallery: [SCENE + "lakehouse.webp", TEX + "delta.webp"],
      galleryLabels: ["The cabin, drawn", "The water from above"],
      blurb: "A lake cabin with a wood-fired sauna on the jetty and a ladder straight into the water.",
      story: "Heat the sauna in the afternoon and it is ready by dusk, which is the whole schedule. The lake is cold in every month and that is the point. Bring one good book; there is no signal past the second bend.",
      amenities: ["lantern", "signpost", "towel", "coffee", "bicycle", "door"],
      host: "Tomaž", tags: ["Illustrated preview", "Wood-fired sauna"], illustrated: true
    },
    {
      id: "fienile", name: "Fienile Bianco", place: "Montalcino, Italy", collection: "countryside",
      collectionLabel: "Countryside", rate: 240, rating: 4.78, reviews: 89,
      guests: 2, beds: 1, baths: 1, hero: PHOTO + "tuscany.webp", heroFocus: "32% 70%",
      gallery: [PHOTO + "tuscany.webp", TEX + "fields.webp"],
      galleryLabels: ["The long table", "The fields from above"],
      blurb: "A converted hay barn for two, at the end of a cypress track with no one else on it.",
      story: "One room, done properly: a bed facing the shutters, a small kitchen, and a bath you can see the hills from. The village is a ten-minute walk downhill and a much longer one back up, which is what the bikes are for.",
      amenities: ["bicycle", "coffee", "pasta", "map", "towel", "door"],
      host: "Giulia", tags: ["Best value", "Cypress track, 400m"]
    }
  ];

  var STORY = [
    {
      id: "choose", title: "Tell us the shape of the week",
      body: "Not a destination — a feeling. Somewhere cold enough for a fire, or warm enough to swim before breakfast. We answer with three houses, never thirty, and say plainly what each one asks of you.",
      visual: SCENE + "rome.webp"
    },
    {
      id: "hold", title: "We hold the house, you hold the date",
      body: "Every home is held by one family or one caretaker, and we speak to them before you book. Dates are confirmed by a person within the day, and nothing is charged until they are.",
      visual: SCENE + "amalfi.webp"
    },
    {
      id: "arrive", title: "Arrive to a house that is ready",
      body: "Bags moved ahead, linen changed, and a written itinerary from whoever knows the valley best. If it rains for a week, they will know what to do about it.",
      visual: SCENE + "lakehouse.webp"
    }
  ];

  return {
    AMENITIES: AMENITIES, COLLECTIONS: COLLECTIONS, STAYS: STAYS, STORY: STORY,
    ICON: ICON, TEX: TEX, SCENE: SCENE, PHOTO: PHOTO
  };
})();
