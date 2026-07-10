(function () {
  "use strict";

  var brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  var brl2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function pctFmt(n) { return (Math.round(n * 100) / 100).toString().replace(".", ","); }
  function areaFmt(n) { return n.toFixed(2).replace(".", ",") + " m²"; }
  function kFmt(n) { return Math.round(n / 1000) + "k"; }

  var $ = function (id) { return document.getElementById(id); };

  var data = window.PARKSIDE;
  var byCode = {};
  data.unidades.forEach(function (u) { byCode[u.code] = u; });
  var disponiveis = data.unidades.filter(function (u) { return u.status === "disponivel"; });
  var reservadas = data.unidades.filter(function (u) { return u.status === "reservado"; }).length;

  var sel = $("unit");
  disponiveis.forEach(function (u) {
    var o = document.createElement("option");
    o.value = u.code;
    o.textContent = "Torre " + u.torre + " · Apto " + u.apto + " · " + areaFmt(u.area) + " · " + brl.format(u.valor);
    sel.appendChild(o);
  });
  $("stat-line").innerHTML = "<b>" + disponiveis.length + "</b> unidades disponíveis · <b>" + reservadas + "</b> reservadas";

  var DEFAULTS = {
    entry: 10, "entry-n": 1, desconto: 0,
    "parc-pct": 30, incc: 0, "reforcos-n": 0, "reforco-valor": 0
  };

  // Entrega das chaves fixada em dezembro de 2031
  var ENTREGA = new Date(2031, 11, 1);
  var ENTREGA_LABEL = "dez/2031";
  var ENTREGA_EXT = "dezembro de 2031";
  function mesesAteEntrega() {
    var now = new Date();
    var m = (ENTREGA.getFullYear() - now.getFullYear()) * 12 + (ENTREGA.getMonth() - now.getMonth());
    return Math.max(1, m);
  }

  function pmt(pv, n, i) {
    if (n <= 0) return 0;
    if (i <= 0) return pv / n;
    var f = Math.pow(1 + i, n);
    return (pv * i * f) / (f - 1);
  }
  function inccMensal() {
    var a = Math.max(0, parseFloat($("incc").value) || 0);
    return a > 0 ? Math.pow(1 + a / 100, 1 / 12) - 1 : 0;
  }
  function numFld(id, min) {
    var v = parseFloat($(id).value);
    if (isNaN(v)) v = DEFAULTS[id];
    return Math.max(min, v);
  }
  function currentUnit() { return disponiveis[sel.selectedIndex] || disponiveis[0]; }
  function rendaHint(parcela) {
    return "Renda aproximada exigida: " + brl.format(parcela / 0.3) + "/mês (parcela ≤ 30% da renda).";
  }
  function bd(lines) {
    $("breakdown").innerHTML = lines.filter(Boolean).map(function (l) {
      return '<div class="line' + (l.total ? " total" : "") + '"><span class="lbl">' + l.lbl + '</span><span class="amt">' + l.amt + "</span></div>";
    }).join("");
  }

  function calc() {
    var u = currentUnit();
    if (!u) return;
    refreshMapaSel(u.code);

    var desc = Math.max(0, parseFloat($("desconto").value) || 0);
    var valor = u.valor;
    var valorFinal = valor * (1 - desc / 100);

    $("m-price").textContent = desc > 0 ? brl.format(valorFinal) + " (-" + pctFmt(desc) + "%)" : brl.format(valor);
    $("m-area").textContent = areaFmt(u.area);
    $("m-m2").textContent = brl.format(valorFinal / u.area);

    var p = Math.max(10, parseInt($("entry").value, 10) || 10);
    $("entry-out").textContent = p + "%";
    var entrada = valorFinal * p / 100;
    var nEntrada = numFld("entry-n", 1);
    var parcEntrada = entrada / nEntrada;
    var iIncc = inccMensal();

    var parcPct = numFld("parc-pct", 0);
    var mesesChaves = mesesAteEntrega();
    $("meses-chaves").value = mesesChaves;
    var parcTotal = valorFinal * parcPct / 100;
    var parcMensal = pmt(parcTotal, mesesChaves, iIncc);
    var somaParc = parcMensal * mesesChaves;

    var nRef = Math.round(numFld("reforcos-n", 0));
    var vRef = numFld("reforco-valor", 0);
    var reforcosTotal = nRef * vRef;

    var saldoChaves = valorFinal - entrada - parcTotal - reforcosTotal;
    var avisos = [];
    if (saldoChaves < 0) { saldoChaves = 0; avisos.push("⚠️ Entrada + parcelas + reforços excedem o valor. Ajuste os percentuais."); }

    var total = entrada + reforcosTotal + somaParc + saldoChaves;
    var saldoPct = valorFinal > 0 ? Math.round(saldoChaves / valorFinal * 100) : 0;

    $("r-entry").textContent = brl.format(entrada);
    $("r-entry-sub").textContent = nEntrada > 1 ? nEntrada + "× de " + brl.format(parcEntrada) : "à vista · " + p + "%";

    $("r-parc").textContent = brl2.format(parcMensal);
    $("r-parc-sub").textContent = mesesChaves + "× até " + ENTREGA_LABEL + (iIncc > 0 ? " · +INCC" : "");

    $("r-saldo").textContent = brl.format(saldoChaves);
    $("r-saldo-sub").textContent = saldoPct + "% · quitado na entrega";

    $("r-total").textContent = brl.format(total);
    var acresc = total - valorFinal;
    $("r-total-sub").textContent = acresc > 1 ? "+" + brl.format(acresc) + " (INCC)" : "sem acréscimo";

    var refLine = nRef > 0 ? { lbl: nRef + " reforços de " + brl.format(vRef), amt: brl.format(reforcosTotal) } : null;
    bd([
      { lbl: "Valor do imóvel", amt: brl.format(valor) },
      desc > 0 ? { lbl: "Desconto à vista (" + pctFmt(desc) + "%)", amt: "− " + brl.format(valor - valorFinal) } : null,
      { lbl: "Entrada (" + p + "%)" + (nEntrada > 1 ? " · " + nEntrada + "×" : ""), amt: brl.format(entrada) },
      refLine,
      { lbl: mesesChaves + " parcelas de " + brl2.format(parcMensal), amt: brl.format(somaParc) },
      { lbl: "Saldo nas chaves", amt: brl.format(saldoChaves) },
      { lbl: "Total do plano", amt: brl.format(total), total: true }
    ]);

    avisos.push("Até as chaves: " + brl2.format(parcMensal) + "/mês. " + rendaHint(parcMensal));
    $("warn").textContent = avisos.join("  ");

    var linhas = [["Entrada (" + p + "%)", brl.format(entrada) + (nEntrada > 1 ? " em " + nEntrada + "×" : " à vista")]];
    if (nRef > 0) linhas.push([nRef + " reforços", brl.format(vRef) + " cada"]);
    linhas.push([mesesChaves + " parcelas até a entrega", brl2.format(parcMensal)]);
    linhas.push(["Saldo nas chaves", brl.format(saldoChaves)]);
    linhas.push(["Total do plano", brl.format(total)]);
    fillProposta(u, valor, valorFinal, desc, linhas);
  }

  function fillProposta(u, valor, valorFinal, desc, linhas) {
    var nome = ($("cli-nome").value || "").trim();
    var doc = ($("cli-doc").value || "").trim();
    var corretor = ($("cli-corretor").value || "").trim();
    var hoje = new Date().toLocaleDateString("pt-BR");
    var head = [
      ["Cliente", nome || "—"],
      doc ? ["CPF / contato", doc] : null,
      ["Unidade", "Torre " + u.torre + " · Apto " + u.apto + " · " + areaFmt(u.area)],
      ["Valor" + (desc > 0 ? " (c/ desconto)" : ""), brl.format(valorFinal)],
      ["Entrega das chaves", ENTREGA_EXT],
      corretor ? ["Corretor", corretor] : null,
      ["Data", hoje]
    ].filter(Boolean).concat(linhas);
    $("prop-print").innerHTML = "<h3>Proposta · Parkside</h3>" + head.map(function (l) {
      return '<div class="pl"><span class="lbl">' + l[0] + "</span><span>" + l[1] + "</span></div>";
    }).join("");
  }

  // ---- mapa ----
  function buildMapa() {
    var andares = [], a;
    for (a = 13; a >= 5; a--) andares.push(a);
    var torres = ["A", "B"], units = [1, 2, 3, 4, 5, 6, 7, 8];

    var html = "<table><thead>";
    html += "<tr><th></th><th class='grp' colspan='8'>Torre A</th><th class='grp' colspan='8'>Torre B</th></tr>";
    html += "<tr><th class='andar'>Andar</th>";
    torres.forEach(function () { units.forEach(function (n) { html += "<th>0" + n + "</th>"; }); });
    html += "</tr></thead><tbody>";

    andares.forEach(function (andar) {
      html += "<tr><th class='andar'>" + andar + "º</th>";
      torres.forEach(function (t) {
        units.forEach(function (n) {
          var code = t + (andar * 100 + n);
          var u = byCode[code];
          if (u && u.status === "disponivel") {
            html += "<td><div class='cell disp' data-code='" + code + "'><span class='apto'>" + u.apto + "</span><span class='vlr'>" + kFmt(u.valor) + "</span></div></td>";
          } else if (u && u.status === "reservado") {
            html += "<td><div class='cell res'><span class='apto'>" + u.apto + "</span><span class='vlr'>RES</span></div></td>";
          } else {
            html += "<td><div class='cell nl'><span class='apto'>" + (andar * 100 + n) + "</span></div></td>";
          }
        });
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
    $("mapa").innerHTML = html;

    $("mapa").addEventListener("click", function (e) {
      var cell = e.target.closest(".cell.disp");
      if (!cell) return;
      sel.value = cell.getAttribute("data-code");
      calc();
      document.querySelector(".hero").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  function refreshMapaSel(code) {
    document.querySelectorAll(".mapa .cell.disp").forEach(function (c) {
      c.classList.toggle("sel", c.getAttribute("data-code") === code);
    });
  }

  ["unit", "entry", "entry-n", "desconto", "parc-pct", "incc", "reforcos-n", "reforco-valor",
    "cli-nome", "cli-doc", "cli-corretor"].forEach(function (id) {
    var el = $(id);
    el.addEventListener("input", calc);
    el.addEventListener("change", calc);
  });

  $("reset").addEventListener("click", function () {
    Object.keys(DEFAULTS).forEach(function (id) { $(id).value = DEFAULTS[id]; });
    calc();
  });

  buildMapa();
  calc();
})();
