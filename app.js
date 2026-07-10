(function () {
  "use strict";

  var brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  var brl2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function pct(n) { return (Math.round(n * 10) / 10).toString().replace(".", ","); }
  function m2(n) { return n.toFixed(2).replace(".", "") + " m²"; }
  function areaFmt(n) { return n.toFixed(2).replace(".", ",") + " m²"; }

  var $ = function (id) { return document.getElementById(id); };

  var data = window.PARKSIDE;
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

  var DEFAULTS = { entry: 10, "entry-n": 1, incc: 0, "bal-n": 60, rate: 0, "obra-pct": 20, "obra-meses": 36, "banco-rate": 0.8, "banco-prazo": 360 };

  var mode = "direto";

  // ---- helpers de cálculo ----
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
  function currentUnit() {
    return disponiveis[sel.selectedIndex] || disponiveis[0];
  }

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
    var valor = u.valor;

    $("m-price").textContent = brl.format(valor);
    $("m-area").textContent = areaFmt(u.area);
    $("m-m2").textContent = brl.format(valor / u.area);

    var p = Math.max(10, parseInt($("entry").value, 10) || 10);
    $("entry-out").textContent = p + "%";
    var entradaTotal = valor * p / 100;
    var nEntrada = numFld("entry-n", 1);
    var parcEntrada = entradaTotal / nEntrada;
    var iIncc = inccMensal();

    $("r-entry").textContent = brl.format(entradaTotal);
    $("r-entry-sub").textContent = nEntrada > 1 ? nEntrada + "× de " + brl.format(parcEntrada) : "à vista · " + p + "%";
    $("mode-badge").textContent = mode === "direto" ? "Direto" : "Obra + banco";

    if (mode === "direto") {
      var saldo = valor - entradaTotal;
      var nSaldo = numFld("bal-n", 1);
      var iJuros = Math.max(0, parseFloat($("rate").value) || 0) / 100;
      var iEf = (1 + iJuros) * (1 + iIncc) - 1;
      var parc = pmt(saldo, nSaldo, iEf);
      var totalSaldo = parc * nSaldo;
      var total = entradaTotal + totalSaldo;

      $("r-a-k").textContent = "Saldo";
      $("r-a").textContent = brl.format(saldo);
      $("r-a-sub").textContent = (100 - p) + "% do valor";

      $("r-b-k").textContent = "Parcela mensal";
      $("r-b").textContent = brl2.format(parc);
      var sub = nSaldo + "×";
      if (iJuros > 0) sub += " · " + pct(iJuros * 100) + "% a.m.";
      if (iIncc > 0) sub += " · +INCC";
      if (iJuros === 0 && iIncc === 0) sub += " · sem juros";
      $("r-b-sub").textContent = sub;

      $("r-total").textContent = brl.format(total);
      var acresc = total - valor;
      $("r-total-sub").textContent = acresc > 1 ? "+" + brl.format(acresc) + " (juros/INCC)" : "sem acréscimo";

      bd([
        { lbl: "Valor do imóvel", amt: brl.format(valor) },
        { lbl: "Entrada (" + p + "%)" + (nEntrada > 1 ? " · " + nEntrada + "×" : ""), amt: brl.format(entradaTotal) },
        { lbl: "Saldo (" + (100 - p) + "%)", amt: brl.format(saldo) },
        { lbl: nSaldo + " parcelas de " + brl2.format(parc), amt: brl.format(totalSaldo) },
        { lbl: "Total do plano", amt: brl.format(total), total: true }
      ]);

      $("warn").textContent = rendaHint(parc);
    } else {
      var obraPct = numFld("obra-pct", 0);
      var obraMeses = numFld("obra-meses", 1);
      var bancoRate = Math.max(0, parseFloat($("banco-rate").value) || 0) / 100;
      var bancoPrazo = numFld("banco-prazo", 1);

      var obraValor = valor * obraPct / 100;
      var saldoBanco = valor - entradaTotal - obraValor;
      var estouro = saldoBanco < 0;
      if (estouro) saldoBanco = 0;

      var parcObra = pmt(obraValor, obraMeses, iIncc);
      var totalObra = parcObra * obraMeses;
      var parcBanco = pmt(saldoBanco, bancoPrazo, bancoRate);
      var totalBanco = parcBanco * bancoPrazo;
      var total2 = entradaTotal + totalObra + totalBanco;

      $("r-a-k").textContent = "Parcela obra";
      $("r-a").textContent = brl2.format(parcObra);
      $("r-a-sub").textContent = obraMeses + "× · " + obraPct + "%" + (iIncc > 0 ? " · +INCC" : "");

      $("r-b-k").textContent = "Parcela banco";
      $("r-b").textContent = brl2.format(parcBanco);
      $("r-b-sub").textContent = bancoPrazo + "× · " + pct(bancoRate * 100) + "% a.m.";

      $("r-total").textContent = brl.format(total2);
      $("r-total-sub").textContent = brl.format(saldoBanco) + " no banco";

      bd([
        { lbl: "Valor do imóvel", amt: brl.format(valor) },
        { lbl: "Entrada (" + p + "%)" + (nEntrada > 1 ? " · " + nEntrada + "×" : ""), amt: brl.format(entradaTotal) },
        { lbl: obraMeses + " parcelas de obra (" + obraPct + "%)", amt: brl.format(totalObra) },
        { lbl: "Saldo financiado pelo banco", amt: brl.format(saldoBanco) },
        { lbl: bancoPrazo + " parcelas banco de " + brl2.format(parcBanco), amt: brl.format(totalBanco) },
        { lbl: "Total estimado", amt: brl.format(total2), total: true }
      ]);

      $("warn").textContent = estouro
        ? "⚠️ Entrada + obra somam mais que o valor do imóvel. Reduza os percentuais."
        : "Durante a obra: " + brl2.format(parcObra) + "/mês. " + rendaHint(parcObra);
    }
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
  ["unit", "entry", "entry-n", "incc", "bal-n", "rate", "obra-pct", "obra-meses", "banco-rate", "banco-prazo"].forEach(function (id) {
    var el = $(id);
    el.addEventListener("input", calc);
    el.addEventListener("change", calc);
  });

  $("reset").addEventListener("click", function () {
    Object.keys(DEFAULTS).forEach(function (id) { $(id).value = DEFAULTS[id]; });
    calc();
  });

  calc();
})();
