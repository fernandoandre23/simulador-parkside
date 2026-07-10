/*
 * Base de dados do empreendimento PARKSIDE.
 * Fonte: TABELA DE PREÇO PARKSIDE (PDF, 3 páginas).
 *
 * Áreas privativas (m²) por unidade (últimos 2 dígitos do apto):
 *   Torre A: 01=47,22 02=45,55 03=45,83 04=46,29 05=31,33 06=31,18 07=24,26 08=29,62
 *   Torre B: 01=46,22 02=45,57 03=45,37 04=45,73 05=32,15 06=24,08 07=31,18 08=31,33
 *   Garagem: 10,8 (todas as unidades).
 *
 * Preços (mapa código -> valor). "R" = RESERVADO. Ausente = não listado na tabela.
 */
(function (global) {
  var AREA_A = { 1: 47.22, 2: 45.55, 3: 45.83, 4: 46.29, 5: 31.33, 6: 31.18, 7: 24.26, 8: 29.62 };
  var AREA_B = { 1: 46.22, 2: 45.57, 3: 45.37, 4: 45.73, 5: 32.15, 6: 24.08, 7: 31.18, 8: 31.33 };
  var GARAGEM = 10.8;

  var PRECOS = {
    // Andar 5
    A501: 610000, A502: 590000, A503: 595000, A504: 600000, A505: 435000, A506: 435000, A507: "R", A508: 415000,
    B501: 600000, B502: 590000, B503: 590000, B504: 595000, B505: 450000, B506: "R", B507: 430000,
    // Andar 6
    A601: 615000, A605: 440000, A606: 440000, A607: "R", A608: 420000,
    B601: 605000, B602: 595000, B603: 595000, B604: "R", B605: "R", B606: "R", B607: 435000, B608: 470000,
    // Andar 7
    A705: 445000, A706: 445000, A707: "R", A708: 425000,
    B705: "R", B706: "R", B707: 440000, B708: "R",
    // Andar 8
    A801: 625000, A802: 605000, A803: 610000, A804: 615000, A805: "R", A806: "R", A807: "R", A808: "R",
    B801: 615000, B802: 605000, B803: "R", B804: "R", B805: "R", B806: "R", B807: "R", B808: "R",
    // Andar 9
    A901: 630000, A902: 610000, A903: 615000, A904: 620000, A905: "R", A906: "R", A907: 385000, A908: 435000,
    B901: "R", B902: "R", B903: 610000, B904: "R", B905: "R", B906: "R", B907: "R", B908: "R",
    // Andar 10
    A1001: 635000, A1002: 615000, A1003: 620000, A1004: 625000, A1005: 460000, A1006: 460000, A1007: 390000, A1008: 440000,
    B1001: 625000, B1002: 615000, B1003: 615000, B1004: "R", B1005: "R", B1006: 385000, B1007: 455000, B1008: 490000,
    // Andar 11
    A1101: 640000, A1102: 620000, A1103: 625000, A1104: 630000, A1105: 465000, A1106: 465000, A1107: 395000, A1108: 445000,
    B1101: 630000, B1102: 620000, B1103: 620000, B1104: 625000, B1105: 480000, B1106: 390000, B1107: 460000, B1108: 495000,
    // Andar 12
    A1201: 645000, A1202: 625000, A1203: 630000, A1204: 635000, A1205: 470000, A1206: 470000, A1207: 400000, A1208: 450000,
    B1201: 635000, B1202: 625000, B1203: 625000, B1204: 630000, B1205: 485000, B1206: 395000, B1207: 465000, B1208: 500000,
    // Andar 13
    A1301: 650000, A1302: 630000, A1303: 635000, A1304: 640000, A1305: 475000, A1306: 475000, A1307: 405000, A1308: 455000,
    B1301: 640000, B1302: 630000, B1303: 630000, B1304: 635000, B1305: 490000, B1306: 400000, B1307: 470000, B1308: 505000
  };

  var unidades = [];
  Object.keys(PRECOS).forEach(function (code) {
    var torre = code[0];
    var apto = parseInt(code.slice(1), 10);
    var unidade = apto % 100;
    var andar = Math.floor(apto / 100);
    var area = (torre === "A" ? AREA_A : AREA_B)[unidade];
    var valor = PRECOS[code];
    var status = valor === "R" ? "reservado" : (typeof valor === "number" ? "disponivel" : "nao_listado");
    unidades.push({
      code: code,
      torre: torre,
      apto: apto,
      andar: andar,
      unidade: unidade,
      area: area,
      garagem: GARAGEM,
      valor: typeof valor === "number" ? valor : null,
      status: status
    });
  });

  unidades.sort(function (a, b) {
    return a.apto - b.apto || a.torre.localeCompare(b.torre);
  });

  global.PARKSIDE = {
    empreendimento: "Parkside",
    garagem: GARAGEM,
    unidades: unidades
  };
})(window);
