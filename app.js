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

  // ---- popula unidades ----
  var sel = $("unit");
  disponiveis.forEach(function (u) {
    var o = document.createElement("option");
    o.value = u.code;
    o.textContent = "Torre " + u.torre + " · Apto " + u.apto + " · " + areaFmt(u.area) + " · " + brl.format(u.valor);
    sel.appendChild(o);
  });
  $("stat-line").textContent = disponiveis.length + " unidades disponíveis · " + reservadas + " reservadas";

  var MODE_DESC = {
    direto: "A incorporadora financia o saldo diretamente, em parcelas mensais fixas. Sem banco.",
    banco: "Entrada + parcelas mensais durante a obra; o saldo maior é financiado por um banco na entrega das chaves — reduz muito a parcela mensal."
  };

  var DEFAULTS = {
    entry: 10, "entry-n": 1, desconto: 0, incc: 0, "reforcos-n": 0, "reforco-valor": 0,
    "bal-n": 60, rate: 0, "obra-pct": 20, "obra-meses": 36, "banco-rate": 0.8, "banco-prazo": 360
  };

  var mode = "direto";

  // ---- helpers ----
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
    $("breakdown").innerHTML = lines.map(function (l) {
      return '<div class="line' + (l.total ? " total" : "") + '"><span class="lbl">' + l.lbl + '</span><span class="amt">' + l.amt + "</span></div>";
    }).join("");
  }

  // ---- cálculo principal ----
  function calc() {
    var u = currentUnit();
    if (!u) return;
    refreshMapaSel(u.code);

    var desc = Math.max(0, parseFloat($("desconto").value) || 0);
    var valor = u.valor;
    var valorFinal = valor * (1 - desc / 100);

    $("m-price").textContent = desc > 0
      ? brl.format(valorFinal) + " (-" + pctFmt(desc) + "%)"
      : brl.format(valor);
    $("m-area").textContent = areaFmt(u.area);
    $("m-m2").textContent = brl.format(valorFinal / u.area);

    var p = Math.max(10, parseInt($("entry").value, 10) || 10);
    $("entry-out").textContent = p + "%";
    var entradaTotal = valorFinal * p / 100;
    var nEntrada = numFld("entry-n", 1);
    var parcEntrada = entradaTotal / nEntrada;
    var iIncc = inccMensal();

    var nRef = Math.round(numFld("reforcos-n", 0));
    var vRef = numFld("reforco-valor", 0);
    var reforcosTotal = nRef * vRef;

    $("r-entry").textContent = brl.format(entradaTotal);
    $("r-entry-sub").textContent = nEntrada > 1 ? nEntrada + "× de " + brl.format(parcEntrada) : "à vista · " + p + "%";
    $("mode-badge").textContent = mode === "direto" ? "Direto" : "Obra + banco";

    var refLine = nRef > 0 ? { lbl: nRef + " reforços de " + brl.format(vRef), amt: brl.format(reforcosTotal) } : null;
    var avisos = [];

    if (mode === "direto") {
      var saldo = valorFinal - entradaTotal;
      var saldoParcelar = saldo - reforcosTotal;
      if (saldoParcelar < 0) { saldoParcelar = 0; avisos.push("⚠️ Reforços excedem o saldo — reduza a quantidade ou o valor."); }
      var nSaldo = numFld("bal-n", 1);
      var iJuros = Math.max(0, parseFloat($("rate").value) || 0) / 100;
      var iEf = (1 + iJuros) * (1 + iIncc) - 1;
      var parc = pmt(saldoParcelar, nSaldo, iEf);
      var totalSaldo = parc * nSaldo;
      var total = entradaTotal + reforcosTotal + totalSaldo;

      $("r-a-k").textContent = "Saldo";
      $("r-a").textContent = brl.format(saldo);
      $("r-a-sub").textContent = (100 - p) + "% do valor";

      $("r-b-k").textContent = "Parcela mensal";
      $("r-b").textContent = brl2.format(parc);
      var sub = nSaldo + "×";
      if (iJuros > 0) sub += " · " + pctFmt(iJuros * 100) + "% a.m.";
      if (iIncc > 0) sub += " · +INCC";
      if (iJuros === 0 && iIncc === 0) sub += " · sem juros";
      $("r-b-sub").textContent = sub;

      $("r-total").textContent = brl.format(total);
      var acresc = total - valorFinal;
      $("r-total-sub").textContent = acresc > 1 ? "+" + brl.format(acresc) + " (juros/INCC)" : "sem acréscimo";

      var lines = [{ lbl: "Valor do imóvel", amt: brl.format(valor) }];
      if (desc > 0) lines.push({ lbl: "Desconto à vista (" + pctFmt(desc) + "%)", amt: "− " + brl.format(valor - valorFinal) });
      lines.push({ lbl: "Entrada (" + p + "%)" + (nEntrada > 1 ? " · " + nEntrada + "×" : ""), amt: brl.format(entradaTotal) });
      if (refLine) lines.push(refLine);
      lines.push({ lbl: "Saldo parcelado", amt: brl.format(saldoParcelar) });
      lines.push({ lbl: nSaldo + " parcelas de " + brl2.format(parc), amt: brl.format(totalSaldo) });
      lines.push({ lbl: "Total do plano", amt: brl.format(total), total: true });
      bd(lines);

      avisos.push(rendaHint(parc));
      fillProposta(u, valor, valorFinal, desc, "Parcelamento direto",
        [["Entrada (" + p + "%)", brl.format(entradaTotal) + (nEntrada > 1 ? " em " + nEntrada + "×" : " à vista")]]
          .concat(nRef > 0 ? [[nRef + " reforços", brl.format(vRef) + " cada"]] : [])
          .concat([[nSaldo + " parcelas mensais", brl2.format(parc)], ["Total do plano", brl.format(total)]]));
    } else {
      var obraPct = numFld("obra-pct", 0);
      var obraMeses = numFld("obra-meses", 1);
      var bancoRate = Math.max(0, parseFloat($("banco-rate").value) || 0) / 100;
      var bancoPrazo = numFld("banco-prazo", 1);

      var obraValor = valorFinal * obraPct / 100;
      var saldoBanco = valorFinal - entradaTotal - obraValor - reforcosTotal;
      if (saldoBanco < 0) { saldoBanco = 0; avisos.push("⚠️ Entrada + obra + reforços excedem o valor. Ajuste os percentuais."); }

      var parcObra = pmt(obraValor, obraMeses, iIncc);
      var totalObra = parcObra * obraMeses;
      var parcBanco = pmt(saldoBanco, bancoPrazo, bancoRate);
      var totalBanco = parcBanco * bancoPrazo;
      var total2 = entradaTotal + reforcosTotal + totalObra + totalBanco;

      $("r-a-k").textContent = "Parcela obra";
      $("r-a").textContent = brl2.format(parcObra);
      $("r-a-sub").textContent = obraMeses + "× · " + obraPct + "%" + (iIncc > 0 ? " · +INCC" : "");

      $("r-b-k").textContent = "Parcela banco";
      $("r-b").textContent = brl2.format(parcBanco);
      $("r-b-sub").textContent = bancoPrazo + "× · " + pctFmt(bancoRate * 100) + "% a.m.";

      $("r-total").textContent = brl.format(total2);
      $("r-total-sub").textContent = brl.format(saldoBanco) + " no banco";

      var lines2 = [{ lbl: "Valor do imóvel", amt: brl.format(valor) }];
      if (desc > 0) lines2.push({ lbl: "Desconto à vista (" + pctFmt(desc) + "%)", amt: "− " + brl.format(valor - valorFinal) });
      lines2.push({ lbl: "Entrada (" + p + "%)" + (nEntrada > 1 ? " · " + nEntrada + "×" : ""), amt: brl.format(entradaTotal) });
      if (refLine) lines2.push(refLine);
      lines2.push({ lbl: obraMeses + " parcelas de obra (" + obraPct + "%)", amt: brl.format(totalObra) });
      lines2.push({ lbl: "Saldo financiado pelo banco", amt: brl.format(saldoBanco) });
      lines2.push({ lbl: bancoPrazo + " parcelas banco de " + brl2.format(parcBanco), amt: brl.format(totalBanco) });
      lines2.push({ lbl: "Total estimado", amt: brl.format(total2), total: true });
      bd(lines2);

      avisos.push("Durante a obra: " + brl2.format(parcObra) + "/mês. " + rendaHint(parcObra));
      fillProposta(u, valor, valorFinal, desc, "Obra + financiamento bancário",
        [["Entrada (" + p + "%)", brl.format(entradaTotal) + (nEntrada > 1 ? " em " + nEntrada + "×" : " à vista")]]
          .concat(nRef > 0 ? [[nRef + " reforços", brl.format(vRef) + " cada"]] : [])
          .concat([[obraMeses + " parcelas de obra", brl2.format(parcObra)], ["Saldo no banco", brl.format(saldoBanco)],
            [bancoPrazo + " parcelas banco", brl2.format(parcBanco)], ["Total estimado", brl.format(total2)]]));
    }

    $("warn").textContent = avisos.join("  ");
  }

  // ---- proposta impressa ----
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
      ["Modalidade", modalidade],
      corretor ? ["Corretor", corretor] : null,
      ["Data", hoje]
    ].filter(Boolean).concat(linhas);
    $("prop-print").innerHTML = "<h3>Proposta · Parkside</h3>" + head.map(function (l) {
      return '<div class="pl"><span class="lbl">' + l[0] + "</span><span>" + l[1] + "</span></div>";
    }).join("");
  }

  // ---- mapa de disponibilidade ----
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
      document.querySelector(".wrap").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  function refreshMapaSel(code) {
    var cells = document.querySelectorAll(".mapa .cell.disp");
    cells.forEach(function (c) { c.classList.toggle("sel", c.getAttribute("data-code") === code); });
  }

  // ---- modalidade ----
  document.querySelectorAll("#mode button").forEach(function (b) {
    b.addEventListener("click", function () {
      mode = b.getAttribute("data-mode");
      document.querySelectorAll("#mode button").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      $("fields-direto").classList.toggle("hidden", mode !== "direto");
      $("fields-banco").classList.toggle("hidden", mode !== "banco");
      $("mode-desc").textContent = MODE_DESC[mode];
      calc();
    });
  });
  $("mode-desc").textContent = MODE_DESC.direto;

  // ---- listeners ----
  ["unit", "entry", "entry-n", "desconto", "incc", "reforcos-n", "reforco-valor",
    "bal-n", "rate", "obra-pct", "obra-meses", "banco-rate", "banco-prazo",
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
