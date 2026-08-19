/* GALAXSI — derin coin kartı (ziyaretçinin tarayıcısında çalışır; motor hız-limitine takılmaz).
   SEO coin sayfaları bunu /deepcard.js ile yükler ve GXDeep("<coin-id>") çağırır. */
(function () {
  function GXDeep(cid) {
    var box = document.getElementById('gxdeep');
    if (!box) return;
    box.innerHTML = '<div class="card"><div class="mut">🔍 Derin analiz yükleniyor… (kimlik, tarihçe, geliştirme, SSS)</div></div>';
    fetch('https://api.coingecko.com/api/v3/coins/' + encodeURIComponent(cid) +
          '?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=false')
      .then(function (r) { return r.json(); }).then(render)
      .catch(function () {
        box.innerHTML = '<div class="card"><div class="mut">Derin veri şu an yüklenemedi (kaynak meşgul). Yukarıdaki özet geçerli — sayfayı birazdan yenile.</div></div>';
      });

    function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]});}
    function usd(o){return o&&typeof o==='object'?o.usd:undefined;}
    function fmtUsd(n){if(!n)return'-';n=+n;return n>=1e9?'$'+(n/1e9).toFixed(2)+'B':n>=1e6?'$'+(n/1e6).toFixed(1)+'M':n>=1e3?'$'+(n/1e3).toFixed(0)+'K':'$'+n.toFixed(4);}
    function fnum(n){if(!n)return'-';n=+n;return n>=1e9?(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(0)+'K':Math.round(n);}
    function pf(p){return p==null?'-':(+p<0.01?'$'+(+p).toFixed(8):fmtUsd(p));}
    function pct(n){if(n==null)return'<span class="mut">-</span>';n=+n;var c=n>=0?'grn':'red';return '<span class="'+c+'">'+(n>=0?'+':'')+'%'+Math.abs(n).toFixed(1)+'</span>';}
    function dt(s){if(!s)return'-';try{var x=new Date(s);return x.getDate()+'.'+(x.getMonth()+1)+'.'+x.getFullYear();}catch(e){return'-';}}
    function strip(s){return s?String(s).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim():'';}
    function cs(x){if(/Index|GMCI|Ecosystem|Portfolio|Market Cap/i.test(x))return -1;if(/^(Meme|Dog-Themed|Cat-Themed|Stablecoin|Artificial Intelligence|AI |GameFi|Gaming|DeFi|Decentralized Finance|NFT|Non-Fungible|Real World Assets|RWA|Privacy|Exchange-based|DePIN|Liquid Staking)/i.test(x))return 5;if(/Smart Contract Platform|Layer 1|Layer 2/i.test(x))return 3;if(/Proof of/i.test(x))return 1;return 2;}
    function ageM(g){if(!g)return null;try{var d=new Date(g),n=new Date();return (n.getFullYear()-d.getFullYear())*12+(n.getMonth()-d.getMonth());}catch(e){return null;}}

    function render(d) {
      if (!d || d.error || !d.market_data) { box.innerHTML = ''; return; }
      var md = d.market_data || {}, dev = d.developer_data || {}, com = d.community_data || {};
      var sym = (d.symbol || '').toUpperCase(), rank = d.market_cap_rank;
      var ath = usd(md.ath), athc = usd(md.ath_change_percentage), athd = usd(md.ath_date), atl = usd(md.atl), atld = usd(md.atl_date);
      var g = d.genesis_date, mo = ageM(g), gy = g ? String(g).slice(0, 4) : (athd ? String(athd).slice(0, 4) : null);
      var aget = mo == null ? '-' : (mo >= 12 ? (mo / 12).toFixed(1) + ' yıl' : mo + ' ay');
      var cats = (d.categories || []).filter(Boolean).slice().sort(function (a, b) { return cs(b) - cs(a); });
      var catFull = cats.slice(0, 4).join(', ') || '-';
      var commits = dev.commit_count_4_weeks, stars = dev.stars, forks = dev.forks;
      var tw = com.twitter_followers, rd = com.reddit_subscribers, tg = com.telegram_channel_user_count;
      var up = d.sentiment_votes_up_percentage;
      var circ = md.circulating_supply, maxs = md.max_supply, tot = md.total_supply;
      var mc = usd(md.market_cap) || 0, vol = usd(md.total_volume) || 0;
      var desc = strip((d.description || {}).en); if (desc.length > 480) desc = desc.slice(0, 480).replace(/\s\S*$/, '') + '…';
      var home = ((d.links || {}).homepage || []).filter(Boolean)[0] || '';
      var devlbl = commits >= 20 ? '🟢 çok aktif' : commits > 0 ? '🟡 yavaş (' + commits + ' commit/4hf)' : commits === 0 ? '🔴 durmuş / terk edilmiş olabilir' : '❔ veri yok';
      function row(k, v) { return '<tr><td class="k">' + k + '</td><td class="val">' + v + '</td></tr>'; }

      var h = '';
      h += '<div class="card"><h2>🪪 Kimlik &amp; Tarihçe</h2><table>'
        + row('Kategori', esc(catFull))
        + row('Piyasa sıralaması', rank ? '#' + rank : 'yok ⚠')
        + row('Çıkış · yaş', (gy ? gy + ' · ' : '') + aget)
        + row('🔺 Zirve (ATH)', pf(ath) + ' <span class="mut">(' + dt(athd) + ')</span>')
        + row('🔻 Dip (ATL)', pf(atl) + ' <span class="mut">(' + dt(atld) + ')</span>')
        + '</table></div>';
      h += '<div class="card"><h2>💵 Uzun Dönem Fiyat Geçmişi</h2><table>'
        + row('14 gün', pct(md.price_change_percentage_14d))
        + row('30 gün', pct(md.price_change_percentage_30d))
        + row('60 gün', pct(md.price_change_percentage_60d))
        + row('200 gün', pct(md.price_change_percentage_200d))
        + row('1 yıl', pct(md.price_change_percentage_1y))
        + '</table></div>';
      h += '<div class="card"><h2>🪙 Arz</h2><table>'
        + row('Dolaşan arz', fnum(circ) + ' ' + esc(sym))
        + row('Toplam arz', fnum(tot))
        + row('Maksimum arz', maxs ? fnum(maxs) : 'sınırsız/belirsiz')
        + row('Dolaşımda oran', (maxs && circ) ? '%' + Math.round(circ / maxs * 100) : '-')
        + '</table></div>';
      h += '<div class="card"><h2>👥 Topluluk &amp; 🛠️ Geliştirme</h2><table>'
        + row('Topluluk güveni', up != null ? '%' + Math.round(up) + ' olumlu' : '-')
        + row('Twitter takipçi', fnum(tw))
        + row('Reddit üye', fnum(rd))
        + row('Telegram üye', fnum(tg))
        + row('Geliştirme durumu', devlbl)
        + row('GitHub yıldız · fork', fnum(stars) + ' · ' + fnum(forks))
        + '</table></div>';
      if (desc || home) {
        h += '<div class="card"><h2>📖 ' + esc(d.name) + ' nedir?</h2>'
          + (desc ? '<p style="font-size:14px">' + esc(desc) + '</p>' : '')
          + (home ? '<p style="font-size:13px;margin-top:6px">Resmî site: <a href="' + esc(home) + '" target="_blank" rel="noopener nofollow">' + esc(home.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a></p>' : '')
          + '</div>';
      }
      function qa(q, a) { return '<div style="margin:10px 0"><div class="grn" style="font-weight:600;font-size:14px">' + q + '</div><div style="font-size:14px;margin-top:2px">' + a + '</div></div>'; }
      var f = '';
      var b1 = (mo != null && mo >= 36 && rank && rank <= 100) ? 'Kripto standartlarında <b>köklü ve kanıtlanmış</b> sayılır 🟢' : (mo != null && mo < 12) ? '<b>Çok genç</b> — geçmişi kanıtlanmamış, en riskli dönemde 🔴' : 'Orta yaşta; geçmişi var ama garanti değil 🟡';
      f += qa('⏳ ' + esc(d.name) + ' ne kadar köklü ve güvenilir?', (gy ? gy + ' yılında çıktı, ' : '') + (mo != null ? 'yaklaşık ' + aget + ' piyasada. ' : '') + b1);
      if (athc != null) {
        var b2 = athc < -80 ? 'Zirveyi gören alıcıların çoğu hâlâ ağır zararda; eski seviyeye dönmesi için çok büyük yükseliş gerekir ⚠️' : athc < -40 ? 'Zirveden belirgin uzakta, toparlanma alanı var' : 'Zirveye yakın — pahalı/tepe bölgesi riski';
        f += qa('📉 Fiyatı neden bu halde, pahalı mı?', 'Zirvesi ' + pf(ath) + ' idi (' + dt(athd) + '). Bugün oradan <b>%' + Math.abs(Math.round(athc)) + ' ' + (athc < 0 ? 'aşağıda' : 'yukarıda') + '</b>. ' + b2);
      }
      if (mc && vol) {
        var r = vol / mc, b3 = r >= 0.05 ? 'Yüksek — rahat alınıp satılıyor 🟢' : r < 0.01 ? '<b>Düşük</b> — büyük miktarı satmak zor (likidite tuzağı) 🔴' : 'Orta — normal miktar sorun değil 🟡';
        f += qa('💰 Aldığımı sonra rahat satabilir miyim?', 'Günlük hacim ' + fmtUsd(vol) + ' (piyasa değerinin %' + (r * 100).toFixed(1) + '\'i). ' + b3);
      }
      var b4 = (rank && rank <= 200) ? 'Şu an düşük: büyük ve likit 🟢 (yine de takip et)' : 'Düşük sıralama / az borsa delist riskini artırır — yakından izle 🟡';
      f += qa('⛔ Borsadan atılma (delist) riski var mı?', b4);
      var sr = []; if (mo != null && mo < 6) sr.push('çok yeni'); if (commits === 0) sr.push('geliştirme durmuş'); if (!rank) sr.push('sıralaması yok');
      f += qa('🕵️ Scam / rug-pull olabilir mi?', sr.length ? 'Dikkat: <b>' + sr.join(', ') + '</b>. Bu profildeki coinlerde risk daha yüksek — küçük başla, kaybetmeyi göze alamayacağın parayı koyma 🔴' : 'Klasik rug profiline uymuyor (köklü/aktif) 🟢 — ama hiçbir kripto %100 garanti değildir.');
      f += qa('🔮 Fiyatı yükselir mi, geleceği ne?', 'Bunu <b>KİMSE bilemez</b> — "kesin yükselir" diyen yalan söylüyor. Biz geleceği tahmin etmeyiz, sadece BUGÜNKÜ riski gösteririz. Karar ve sorumluluk sana aittir 🤝');
      h += '<div class="card"><h2>❓ Sık Sorulan Sorular</h2>' + f + '</div>';
      box.innerHTML = h;
      /* AI Laboratuvarı: bu coin bayraklıysa yapay zeka yorumunu en üste ekle (30 dk'da bir motor üretir) */
      fetch('/data/ai_yorum.json').then(function (r) { return r.json(); }).then(function (a) {
        var c = a && a.coins && a.coins[sym];
        if (!c) return;
        var div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = '<h2>🤖 AI Laboratuvarı yorumu</h2><p style="font-size:14px">' + esc(c) + '</p>'
          + '<p class="mut" style="font-size:11px;margin-top:6px">' + esc((a.model || 'AI') + ' · ' + (a.ts || '')) + ' · fiyat tahmini yapmaz · yatırım tavsiyesi değildir</p>';
        box.insertBefore(div, box.firstChild);
      }).catch(function () {});
    }
  }
  window.GXDeep = GXDeep;
})();
