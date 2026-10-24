// Static catalog for the demo data: fictional customers, staff, cities, equipment models and texts.
// All company and person names are invented.

export const STAFF = [
  { key: "manager", email: "manager.demo@example.com", name: "Mara Schulte", role: "manager", demo: true },
  { key: "coordinator", email: "coordinator.demo@example.com", name: "Jonas Becker", role: "coordinator", demo: true },
  { key: "technician", email: "technician.demo@example.com", name: "Tobias Wagner", role: "technician", demo: true },
  { key: "viewer", email: "viewer.demo@example.com", name: "Henrik Velden", role: "viewer", demo: true },
  { key: "coordinator2", email: "s.kraemer@example.com", name: "Sabine Krämer", role: "coordinator" },
  { key: "tech2", email: "m.demir@example.com", name: "Murat Demir", role: "technician" },
  { key: "tech3", email: "s.kowalczyk@example.com", name: "Sven Kowalczyk", role: "technician" },
  { key: "tech4", email: "a.brueckner@example.com", name: "Anna Brückner", role: "technician" },
  { key: "tech5", email: "f.hartmann@example.com", name: "Felix Hartmann", role: "technician" },
  { key: "tech6", email: "k.ludwig@example.com", name: "Kevin Ludwig", role: "technician" },
  { key: "sales", email: "l.hoffmann@example.com", name: "Lena Hoffmann", role: "viewer" },
];

// City -> 3-digit postal code prefix (the seed adds two random digits).
export const CITIES = {
  Essen: "451", Dortmund: "441", Bochum: "447", Duisburg: "470", Gelsenkirchen: "458",
  Oberhausen: "460", "Mülheim an der Ruhr": "454", Herne: "446", Bottrop: "462",
  Recklinghausen: "456", Hagen: "580", Witten: "584", Gladbeck: "459", Hattingen: "455",
  "Castrop-Rauxel": "445",
};

export const STREETS = [
  "Hauptstraße", "Bahnhofstraße", "Kettwiger Straße", "Rüttenscheider Straße", "Hellweg",
  "Westfalendamm", "Königsallee", "Viktoriastraße", "Zechenstraße", "Hafenstraße", "Gartenstraße",
  "Kirchstraße", "Ruhrallee", "Emscherstraße", "Lindenallee", "Schillerstraße", "Goethestraße",
  "Am Stadtpark", "Industriestraße", "Grubenweg", "Glückaufstraße", "Kanalstraße", "Marktplatz",
  "Wittener Straße", "Dorstener Straße", "Essener Straße", "Bochumer Straße", "Am Förderturm",
];

export const FIRST_NAMES = ["Thomas", "Petra", "Michael", "Sandra", "Andreas", "Claudia", "Stefan", "Nicole",
  "Markus", "Julia", "Jan", "Katrin", "Daniel", "Melanie", "Oliver", "Sabine", "Christian", "Ayşe", "Mehmet",
  "Elena", "Piotr", "Laura", "Dirk", "Heike"];
export const LAST_NAMES = ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker",
  "Schulz", "Koch", "Richter", "Klein", "Wolf", "Neumann", "Schwarz", "Zimmermann", "Krüger", "Hartmann",
  "Lange", "Werner", "Öztürk", "Nowak", "Lehmann", "Krause"];

// [name, segment, city]. "Datenhaus Emscher GmbH" is the server room with repeated breakdowns.
export const CUSTOMERS = [
  ["Brandt & Vogel Rechtsanwälte", "OFFICE", "Essen"],
  ["Steuerberatung Kaiser Partner", "OFFICE", "Dortmund"],
  ["Ingenieurbüro Lindner", "OFFICE", "Bochum"],
  ["Hellweg Versicherungsmakler GmbH", "OFFICE", "Dortmund"],
  ["Architekturbüro Zechenblick", "OFFICE", "Essen"],
  ["Ruhrtal Immobilienverwaltung", "OFFICE", "Mülheim an der Ruhr"],
  ["Kemper Logistik Verwaltung", "OFFICE", "Duisburg"],
  ["Medienagentur Zeche Neun", "OFFICE", "Gelsenkirchen"],
  ["Wirtschaftsprüfung Kranz & Co.", "OFFICE", "Essen"],
  ["Notariat am Kennedyplatz", "OFFICE", "Essen"],
  ["Becker Bauplanung GmbH", "OFFICE", "Herne"],
  ["Personalberatung Stahl & Kohle", "OFFICE", "Oberhausen"],
  ["Software Werkstatt Bochum GmbH", "OFFICE", "Bochum"],
  ["Hafenwerk Duisburg Verwaltung", "OFFICE", "Duisburg"],
  ["Coworking Kokerei", "OFFICE", "Essen"],
  ["Energieberatung Emscher", "OFFICE", "Recklinghausen"],
  ["Revier Service Center GmbH", "OFFICE", "Hagen"],
  ["Sachverständigenbüro Albers", "OFFICE", "Witten"],
  ["Praxisklinik am Stadtgarten", "CLINIC", "Gelsenkirchen"],
  ["MVZ Ruhrbogen", "CLINIC", "Bochum"],
  ["Zahnarztpraxis Dr. Wenzel", "CLINIC", "Essen"],
  ["Dialysezentrum Hattingen", "CLINIC", "Hattingen"],
  ["Physiotherapie Lohmann", "CLINIC", "Dortmund"],
  ["Tierklinik Kirchhellen", "CLINIC", "Bottrop"],
  ["Radiologie am Ostpark", "CLINIC", "Dortmund"],
  ["Augenzentrum Witten", "CLINIC", "Witten"],
  ["Hausarztpraxis Dr. Yilmaz & Kollegen", "CLINIC", "Herne"],
  ["Labor Medica Ruhr", "CLINIC", "Essen"],
  ["Hotel Zollverein Residenz", "HOTEL", "Essen"],
  ["Parkhotel Mülheim", "HOTEL", "Mülheim an der Ruhr"],
  ["Boardinghouse Hafenblick", "HOTEL", "Duisburg"],
  ["Hotel Glückauf", "HOTEL", "Gelsenkirchen"],
  ["Landhotel Ruhraue", "HOTEL", "Hattingen"],
  ["City Hotel Rheinlanddamm", "HOTEL", "Dortmund"],
  ["Gästehaus Halde Haniel", "HOTEL", "Bottrop"],
  ["Feinkost Albers", "RETAIL", "Essen"],
  ["Modehaus Krüger", "RETAIL", "Bochum"],
  ["Bio-Markt Grüne Ruhr", "RETAIL", "Dortmund"],
  ["Apotheke am Markt Herne", "RETAIL", "Herne"],
  ["Elektro Schäfer Fachmarkt", "RETAIL", "Oberhausen"],
  ["Buchhandlung Seitenweise", "RETAIL", "Recklinghausen"],
  ["Optik Brenner", "RETAIL", "Gladbeck"],
  ["Juwelier Hagemann", "RETAIL", "Mülheim an der Ruhr"],
  ["Getränke Kolbe", "RETAIL", "Castrop-Rauxel"],
  ["Fahrradladen Pedalritter", "RETAIL", "Witten"],
  ["Gesamtschule Emscherpark", "SCHOOL", "Gelsenkirchen"],
  ["Gymnasium am Hellweg", "SCHOOL", "Dortmund"],
  ["Grundschule Kirchhellen-Nord", "SCHOOL", "Bottrop"],
  ["Berufskolleg Technik Ruhr", "SCHOOL", "Bochum"],
  ["Kita Sonnenzeche", "SCHOOL", "Essen"],
  ["Musikschule Ruhrklang", "SCHOOL", "Hagen"],
  ["Volkshochschule Castrop Außenstelle", "SCHOOL", "Castrop-Rauxel"],
  ["Sprachschule Lingua Ruhr", "SCHOOL", "Duisburg"],
  ["Datenhaus Emscher GmbH", "SERVER_ROOM", "Gelsenkirchen"],
  ["IT-Systemhaus Kruse", "SERVER_ROOM", "Essen"],
  ["Hosting Revier GmbH", "SERVER_ROOM", "Dortmund"],
  ["Netzwerkservice Ruhr-Lenne", "SERVER_ROOM", "Hagen"],
  ["Cloudwerk Bochum GmbH", "SERVER_ROOM", "Bochum"],
  ["Kirchengemeinde St. Barbara", "OTHER", "Gladbeck"],
  ["Vereinsheim Rot-Weiß Gladbeck", "OTHER", "Gladbeck"],
];

export const SITE_NAMES = {
  OFFICE: ["Head office", "Branch office", "Building B", "Archive"],
  CLINIC: ["Practice", "Treatment wing", "Branch practice"],
  HOTEL: ["Main building", "Annex", "Conference centre"],
  RETAIL: ["Main store", "Branch store", "Warehouse"],
  SCHOOL: ["Main building", "Gym", "New building"],
  SERVER_ROOM: ["Server room", "Data centre hall 2"],
  OTHER: ["Main building", "Hall"],
};

// Equipment types per segment (weighted by repetition).
export const TYPES_BY_SEGMENT = {
  OFFICE: ["SPLIT_AC", "SPLIT_AC", "MULTI_SPLIT", "MULTI_SPLIT", "VENTILATION"],
  CLINIC: ["SPLIT_AC", "MULTI_SPLIT", "VENTILATION", "VENTILATION", "HEAT_PUMP"],
  HOTEL: ["MULTI_SPLIT", "MULTI_SPLIT", "VENTILATION", "CHILLER", "HEAT_PUMP"],
  RETAIL: ["SPLIT_AC", "SPLIT_AC", "HEAT_PUMP", "MULTI_SPLIT"],
  SCHOOL: ["VENTILATION", "VENTILATION", "HEAT_PUMP", "SPLIT_AC"],
  SERVER_ROOM: ["SPLIT_AC", "SPLIT_AC", "CHILLER"],
  OTHER: ["HEAT_PUMP", "SPLIT_AC", "VENTILATION"],
};

// [manufacturer, model, serial prefix, min kW, max kW]
export const MODELS = {
  SPLIT_AC: [
    ["Daikin", "FTXM35R", "DKN", 3.5, 3.5], ["Daikin", "FTXM50R", "DKN", 5.0, 5.0],
    ["Mitsubishi Electric", "MSZ-LN35VG", "MEL", 3.5, 3.5], ["Mitsubishi Electric", "PUZ-ZM100", "MEL", 10, 10],
    ["Panasonic", "CS-Z50ZKEW", "PAN", 5.0, 5.0], ["LG", "S12ET Standard", "LGE", 3.5, 3.5],
  ],
  MULTI_SPLIT: [
    ["Daikin", "5MXM90A", "DKN", 9.0, 9.0], ["Mitsubishi Electric", "MXZ-4F72VF", "MEL", 7.2, 7.2],
    ["Panasonic", "CU-5Z90TBE", "PAN", 9.0, 9.0], ["Toshiba", "RAS-5M34G3AVG", "TSB", 10.0, 10.0],
  ],
  HEAT_PUMP: [
    ["Vaillant", "aroTHERM plus VWL 105/6", "VAI", 10, 10], ["Viessmann", "Vitocal 250-A", "VIE", 8, 13],
    ["Stiebel Eltron", "WPL 25 A", "STE", 12, 12], ["Wolf", "CHA-10", "WLF", 10, 10],
  ],
  VENTILATION: [
    ["Wolf", "CWL-2-325", "WLF", 2.0, 2.0], ["Systemair", "Topvex FR06", "SYS", 6.0, 6.0],
    ["Swegon", "GOLD RX 012", "SWG", 9.0, 9.0], ["Zehnder", "ComfoAir Q450", "ZEH", 1.5, 1.5],
  ],
  CHILLER: [
    ["Carrier", "30RBP 060", "CAR", 60, 60], ["Trane", "CGAX 036", "TRN", 36, 36],
    ["Stulz", "CyberCool 2", "STZ", 45, 45], ["Daikin", "EWAT-B 085", "DKN", 85, 85],
  ],
};

export const TICKET_ISSUES = {
  SPLIT_AC: ["No cooling, indoor unit blowing warm air", "Water dripping from indoor unit", "Error code on display, unit stops after a few minutes", "Loud rattling noise from outdoor unit", "Unit does not react to remote control"],
  MULTI_SPLIT: ["Two of four indoor units not cooling", "Outdoor unit trips the circuit breaker", "Condensate leaking in meeting room", "Error code U4 (communication fault)"],
  HEAT_PUMP: ["No heating, error on control panel", "Outdoor unit iced up", "Hot water temperature too low", "High pressure fault, unit locked out"],
  VENTILATION: ["Supply fan not running", "Filter alarm does not reset", "Draught and noise in classrooms", "CO2 level too high, ventilation not ramping up"],
  CHILLER: ["Chiller in alarm, chilled water temperature rising", "Compressor 2 tripped on overload", "Low refrigerant pressure alarm", "Flow switch fault"],
};

export const RESOLUTIONS = [
  "Cleaned blocked condensate drain and tested.", "Replaced faulty fan motor.", "Refrigerant leak found at flare joint, repaired and recharged.",
  "Reset controller and updated parameters.", "Replaced defective temperature sensor.", "Cleaned heat exchanger and replaced filters.",
  "Replaced contactor in outdoor unit.", "Defrost cycle adjusted, unit back in operation.", "Communication cable repaired.",
  "Replaced capacitor of compressor.",
];

export const VISIT_NOTES = {
  OK: ["Cleaning and inspection done, no findings.", "Filters replaced, all values within range.", "Annual inspection completed, unit in good condition."],
  ISSUES_FOUND: ["Filters heavily soiled, replaced.", "Condensate drain partially blocked, cleaned.", "Refrigerant pressure slightly low, leak test recommended.", "Fan bearing noisy, replacement proposed."],
  FOLLOW_UP_REQUIRED: ["Compressor current above nominal, follow-up visit required.", "Corrosion on outdoor unit, repair offer to be sent.", "Control board shows intermittent faults, part ordered."],
};

export const TERMINATION_REASONS = [
  "Customer moved to a new building with its own facility management.",
  "Customer switched to another service provider after price increase.",
];
