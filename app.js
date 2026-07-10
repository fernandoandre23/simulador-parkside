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

  var MODE_DESC = {
    banco: "O saldo remanescente na entrega das chaves é financiado por um banco.",
    proprio: "O saldo remanescente é quitado à vista na entrega, com recurso próprio do cliente."
  };

  var DEFAULTS = {
    entry: 10, "entry-n": 1, desconto: 0,
    "parc-pct": 30, "meses-chaves": 36, incc: 0, "reforcos-n": 0, "reforco-valor": 0,
    "banco-rate": 0.8, "banco-prazo": 360
  };

  var mode = "banco";

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
    var mesesChaves = numFld("meses-chaves", 1);
    var parcTotal = valorFinal * parcPct / 100;
    var parcMensal = pmt(parcTotal, mesesChaves, iIncc);
    var somaParc = parcMensal * mesesChaves;

    var nRef = Math.round(numFld("reforcos-n", 0));
    var vRef = numFld("reforco-valor", 0);
    var reforcosTotal = nRef * vRef;

    var saldoEntrega = valorFinal - entrada - parcTotal - reforcosTotal;
    var avisos = [];
    if (saldoEntrega < 0) { saldoEntrega = 0; avisos.push("⚠️ Entrada + parcelas + reforços excedem o valor. Ajuste os percentuais."); }

    $("r-entry").textContent = brl.format(entrada);
    $("r-entry-sub").textContent = nEntrada > 1 ? nEntrada + "× de " + brl.format(parcEntrada) : "à vista · " + p + "%";

    $("r-parc").textContent = brl2.format(parcMensal);
    $("r-parc-sub").textContent = mesesChaves + "× até as chaves" + (iIncc > 0 ? " · +INCC" : "");

    var refLine = nRef > 0 ? { lbl: nRef + " reforços de " + brl.format(vRef), amt: brl.format(reforcosTotal) } : null;

    var lines = [
      { lbl: "Valor do imóvel", amt: brl.format(valor) },
      desc > 0 ? { lbl: "Desconto à vista (" + pctFmt(desc) + "%)", amt: "− " + brl.format(valor - valorFinal) } : null,
      { lbl: "Entrada (" + p + "%)" + (nEntrada > 1 ? " · " + nEntrada + "×" : ""), amt: brl.format(entrada) },
      refLine,
      { lbl: mesesChaves + " parcelas de " + brl2.format(parcMensal), amt: brl.format(somaParc) }
    ];

    if (mode === "banco") {
      var bancoRate = Math.max(0, parseFloat($("banco-rate").value) || 0) / 100;
      var bancoPrazo = numFld("banco-prazo", 1);
      var parcBanco = pmt(saldoEntrega, bancoPrazo, bancoRate);
      var totalBanco = parcBanco * bancoPrazo;
      var total = entrada + reforcosTotal + somaParc + totalBanco;

      $("mode-badge").textContent = "Financiamento";
      $("r-quit-k").textContent = "Financiamento";
      $("r-quit").textContent = brl2.format(parcBanco);
      $("r-quit-sub").textContent = bancoPrazo + "× · " + pctFmt(bancoRate * 100) + "% a.m.";

      $("r-total").textContent = brl.format(total);
      $("r-total-sub").textContent = brl.format(saldoEntrega) + " no banco";

      lines.push({ lbl: "Saldo financiado na entrega", amt: brl.format(saldoEntrega) });
      lines.push({ lbl: bancoPrazo + " parcelas banco de " + brl2.format(parcBanco), amt: brl.format(totalBanco) });
      lines.push({ lbl: "Total estimado", amt: brl.format(total), total: true });
      bd(lines);

      avisos.push("Até as chaves: " + brl2.format(parcMensal) + "/mês. " + rendaHint(Math.max(parcMensal, parcBanco)));
      fillProposta(u, valor, valorFinal, desc, "Entrada + parcelas até as chaves · quitação por financiamento bancário",
        propLinhas(p, entrada, nEntrada, nRef, vRef, mesesChaves, parcMensal)
          .concat([["Saldo na entrega (banco)", brl.format(saldoEntrega)], [bancoPrazo + " parcelas banco", brl2.format(parcBanco)], ["Total estimado", brl.format(total)]]));
    } else {
      var totalP = entrada + reforcosTotal + somaParc + saldoEntrega;

      $("mode-badge").textContent = "Recurso próprio";
      $("r-quit-k").textContent = "Na entrega";
      $("r-quit").textContent = brl.format(saldoEntrega);
      $("r-quit-sub").textContent = "à vista (recurso próprio)";

      $("r-total").textContent = brl.format(totalP);
      var acresc = totalP - valorFinal;
      $("r-total-sub").textContent = acresc > 1 ? "+" + brl.format(acresc) + " (INCC)" : "sem acréscimo";

      lines.push({ lbl: "Quitação na entrega (à vista)", amt: brl.format(saldoEntrega) });
      lines.push({ lbl: "Total do plano", amt: brl.format(totalP), total: true });
      bd(lines);

      avisos.push("Até as chaves: " + brl2.format(parcMensal) + "/mês. " + rendaHint(parcMensal));
      fillProposta(u, valor, valorFinal, desc, "Entrada + parcelas até as chaves · quitação com recurso próprio",
        propLinhas(p, entrada, nEntrada, nRef, vRef, mesesChaves, parcMensal)
          .concat([["Quitação na entrega (à vista)", brl.format(saldoEntrega)], ["Total do plano", brl.format(totalP)]]));
    }

    $("warn").textContent = avisos.join("  ");
  }

  function propLinhas(p, entrada, nEntrada, nRef, vRef, mesesChaves, parcMensal) {
    var l = [["Entrada (" + p + "%)", brl.format(entrada) + (nEntrada > 1 ? " em " + nEntrada + "×" : " à vista")]];
    if (nRef > 0) l.push([nRef + " reforços", brl.format(vRef) + " cada"]);
    l.push([mesesChaves + " parcelas até as chaves", brl2.format(parcMensal)]);
    return l;
  }

  function fillProposta(u, valor, valorFinal, desc, modalidade, linhas) {
    var nome = ($("cli-nome").value || "").trim();
    var doc = ($("cli-doc").value || "").trim();
    var corretor = ($("cli-corretor").value || "").trim();
    var hoje = new Date().toLocaleDateString("pt-BR");
    var head = [
      ["Cliente", nome || "—"],
      doc ? ["CPF / contato", doc] : null,
      ["Unidade", "Torre " + u.torre + " · Apto " + u.apto + " · " + areaFmt(u.area)],
      ["Valor" + (desc > 0 ? " (c/ desconto)" : ""), brl.format(valorFinal)],
      ["Plano", modalidade],
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

  // ---- quitação (modalidade) ----
  document.querySelectorAll("#mode button").forEach(function (b) {
    b.addEventListener("click", function () {
      mode = b.getAttribute("data-mode");
      document.querySelectorAll("#mode button").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      $("fields-banco").classList.toggle("hidden", mode !== "banco");
      $("mode-desc").textContent = MODE_DESC[mode];
      calc();
    });
  });
  $("mode-desc").textContent = MODE_DESC.banco;

  ["unit", "entry", "entry-n", "desconto", "parc-pct", "meses-chaves", "incc", "reforcos-n", "reforco-valor",
    "banco-rate", "banco-prazo", "cli-nome", "cli-doc", "cli-corretor"].forEach(function (id) {
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
