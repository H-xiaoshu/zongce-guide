/* ============================================================================
 * 综测学分攻略站 · 应用逻辑
 * ==========================================================================*/
(function () {
  'use strict';

  const P = window.POLICY;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (n) => (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '.00');
  const num1 = (n) => (Math.round(n * 10) / 10).toFixed(1);

  /* ======================== 导航 ======================== */
  const NAV = [
    ['keys', '核心结论'], ['calc', '综测计算器'], ['weights', '总分构成'],
    ['moral', '思想道德'], ['academic', '专业文化'], ['practice', '实践创新'],
    ['body', '身体心理'], ['depart', '职位总表'], ['credit', '第二课堂'],
    ['award', '奖学金'], ['redline', '红线'], ['pit', '避坑'], ['plan', '行动清单']
  ];

  function buildNav() {
    const nav = $('#nav');
    nav.innerHTML = NAV.map(([id, t]) =>
      `<a href="#${id}" data-t="${id}">${t}</a>`).join('');
    $('#menuBtn').onclick = () => nav.classList.toggle('open');
    nav.onclick = (e) => { if (e.target.tagName === 'A') nav.classList.remove('open'); };
  }

  function initScrollSpy() {
    const links = $$('#nav a');
    const targets = NAV.map(([id]) => $('#' + id)).filter(Boolean);
    const bar = $('#readbar');
    const onScroll = () => {
      let cur = null;
      const y = window.scrollY + 140;
      targets.forEach(el => { if (el.offsetTop <= y) cur = el.id; });
      links.forEach(a => a.classList.toggle('active', a.dataset.t === cur));
      const tt = $('#totop');
      if (tt) tt.classList.toggle('on', window.scrollY > 600);
      if (bar) {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (h > 0 ? Math.min(100, window.scrollY / h * 100) : 0) + '%';
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  /* 数字更新
   * 直接写入准确值，动画交给 CSS。
   * 不用 requestAnimationFrame 做数值插值——rAF 在后台标签页/无头浏览器会被节流，
   * 会让页面停在中间值从而显示错误分数。数字正确性优先。 */
  function animateNum(el, to, digits) {
    if (!el) return;
    const target = Number(to) || 0;
    el.dataset.v = target;
    el.textContent = digits === 1 ? num1(target) : num(target);
    // 轻微脉冲，给一点反馈
    el.classList.remove('num-pop');
    void el.offsetWidth;            // 强制重排以重启动画
    el.classList.add('num-pop');
  }

  /* 键盘快捷键 */
  function initShortcuts() {
    const map = { '1': 'moral', '2': 'academic', '3': 'practice', '4': 'body' };
    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') {
        if (e.key === 'Escape') e.target.blur();
        return;
      }
      if (e.key === 'Escape') {
        const nav = $('#nav'); if (nav) nav.classList.remove('open');
        return;
      }
      if (map[e.key]) {
        const el = document.getElementById(map[e.key]);
        if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      }
    });
  }

  function initReveal() {
    // 只有支持 IntersectionObserver 且用户未要求减少动效时，才启用"隐藏→淡入"
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!('IntersectionObserver' in window) || reduce) return;
    document.documentElement.classList.add('js-anim');

    const showInView = () => {
      $$('.reveal:not(.in)').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.96 && r.bottom > 0) el.classList.add('in');
      });
    };

    const io = new IntersectionObserver((es) => {
      es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
    $$('.reveal').forEach(el => io.observe(el));

    // 立即显示首屏元素；再设兜底，确保任何环境下内容都不会一直隐藏
    showInView();
    setTimeout(showInView, 350);
    setTimeout(() => $$('.reveal').forEach(el => el.classList.add('in')), 2000);
  }

  /* ======================== 通用渲染件 ======================== */
  function table(head, rows, opts) {
    opts = opts || {};
    const th = head.map(h => `<th>${esc(h)}</th>`).join('');
    const tb = rows.map(r => '<tr>' + r.map((c, i) => {
      if (typeof c === 'number') {
        const cls = 'num' + (c === 0 ? ' zero' : '') + (c >= 10 ? ' hi' : '');
        return `<td class="${cls}">${c}</td>`;
      }
      return `<td class="${i === 0 && opts.firstBold ? 'dim' : ''}">${c}</td>`;
    }).join('') + '</tr>').join('');
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`;
  }

  function callout(kind, html) {
    return `<div class="callout ${kind}">${html}</div>`;
  }

  /* ======================== 首页 ======================== */
  function renderHero() {
    const stats = [
      ['60%', '专业成绩权重'],
      ['4 分', '第二课堂毕业线'],
      ['30 分', '思想道德奖励上限'],
      ['60 分', '实践创新奖励上限'],
      ['10 分', '学生干部最高加分'],
      ['100 分', '综测满分']
    ];
    $('#heroStats').innerHTML = stats.map(([n, l]) =>
      `<div class="hstat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('');
  }

  const KEYS = [
    { h: '专业成绩占 60%，是绝对大头', p: '综测 = 思想道德×15% + <b>专业文化×60%</b> + 实践创新×15% + 身体心理×10%。专业分就是你的加权平均分，没有上限，其它三块都有奖励分封顶。', tag: '成绩优先' },
    { h: '第二课堂学分是独立毕业门槛', p: '它和课程学分是两套体系。必须修满 <b>4 学分</b>才能毕业，低于 4 分记「不合格」，<b>不可毕业</b>——即使所有课程都及格。', tag: '硬门槛' },
    { h: '很多荣誉其实不加分', p: '十佳大学生、优秀学生干部、国家奖助学金、优秀青年志愿者……这些<b>一律不加分</b>。因为它们是"以综测成绩为依据"产生的，不能再倒回来加分。', tag: '别误会' },
    { h: '学生干部有两套分值，别混', p: '在<b>思想道德</b>里最高加 <b>10 分</b>（8 档）；在<b>第二课堂</b>里最高只计 <b>3 学分</b>（表 3）。两套体系独立计算，各算各的。', tag: '两套体系' },
    { h: '加分必须自己申报，过期不补', p: '证书加分写明「当时不申报加分的以后不再享受」。每学年初测评时，把证书、获奖证明、聘书原件准备好交给班级测评小组。', tag: '主动申报' },
    { h: '考试舞弊 = 拿不到学位证', p: '因考试舞弊受记过及以上处分，<b>不能授予学士学位</b>。这是四年里最不能碰的一条线。', tag: '绝对红线' }
  ];

  function renderKeys() {
    $('#keyGrid').innerHTML = KEYS.map((k, i) => `
      <div class="key reveal">
        <div class="idx">${String(i + 1).padStart(2, '0')}</div>
        <h4>${k.h}</h4>
        <p>${k.p}</p>
        <span class="tagline">${k.tag}</span>
      </div>`).join('');
  }

  function renderWeights() {
    $('#weightGrid').innerHTML = P.weights.map(w => `
      <div class="wcard reveal">
        <div class="pct" style="color:${w.color}">${w.pct}%</div>
        <div class="nm">${w.name}</div>
        <div class="ds">${w.desc}</div>
        <div class="wbar"><span style="width:${w.pct}%;background:${w.color}"></span></div>
      </div>`).join('');
  }

  /* ======================== 思想道德 ======================== */
  function renderMoral() {
    const m = P.moral;
    const baseRows = m.base.items.map(i => [i.t, i.v]);
    const cadreRows = P.cadreMoral.map(c => [
      c.role, c.assess, `<span class="num ${c.lv >= 10 ? 'hi' : (c.lv === 0 ? 'zero' : '')}">${c.lv}</span>`
    ]);
    // 干部表自定义渲染（含考核列）
    const cadreTbl = `<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>职务</th><th>考核等级</th><th style="text-align:center">加分</th></tr></thead>
      <tbody>${cadreRows.map(r => `<tr><td>${esc(r[0])}</td><td class="dim">${esc(r[1])}</td>${r[2]}</tr>`).join('')}</tbody>
    </table></div>`;

    $('#moralBody').innerHTML = `
      <div class="card reveal">
        <h3>基础分（满分 70 分）</h3>
        <p class="muted">达到下述要求者即可计 70 分；没有达标的由各班综测小组根据实际情况酌情扣分。</p>
        ${table(['评定标准', '分值'], baseRows)}
      </div>

      <div class="card reveal">
        <h3>奖励分（满分 30 分）</h3>
        <h4>① 向党组织靠拢</h4>
        ${table(['情形', '加分'], [
          ['递交入党申请书且按时提交思想汇报', 5],
          ['确定为入党积极分子并按时提交思想汇报', 8],
          ['中共（预备）党员，发挥先锋模范带头作用且考核合格', 10]
        ])}
        <p class="muted">考核结果由学部党总支提供并传达到各班级加分；党员考核不合格不加分。</p>

        <h4 style="margin-top:20px">② 见义勇为、助人为乐</h4>
        ${table(['级别', '院级', '校级', '省级', '国家级'], [['加分上限', 2, 5, 10, 15]])}
        <p class="muted">需有相关政府部门的通报表扬或县级以上报刊宣传报道。
          紧急情况下为救死扶伤而义务献血（稀有血型、捐献骨髓）并受表彰的可参照酌情加分；
          <b>普通献血证不加分</b>。</p>

        <h4 style="margin-top:20px">③ 担任学生干部（最高加 10 分）</h4>
        ${cadreTbl}
        ${callout('tip', '这一栏是<b>就高不累加</b>：身兼多职按最高职务算。考核等级为「不称职」的一律 0 分。')}

        <h4 style="margin-top:20px">④ 争先创优、文明评比等活动中获表彰</h4>
        ${table(['等次', '国家级', '省级', '学院', '学部'], [
          ['一', 20, 10, 6, 4], ['二', 15, 8, 5, 3],
          ['三', 12, 6, 4, 2], ['鼓励', 8, 4, 3, 1]
        ])}
        <ul class="dot">
          <li>协会或行业组织等主办的活动 <b>减半</b> 加分</li>
          <li>未分等次的可按相应级别 <b>二等</b> 加分</li>
          <li>集体项目排名第一按相应级别加分，<b>其他成员减半</b></li>
          <li>同一活动 <b>就高一次</b> 加分，不重复</li>
          <li>活动项目由各学部综合素质测评领导小组界定</li>
        </ul>
      </div>

      <div class="card reveal" style="background:linear-gradient(150deg,rgba(200,16,46,.1),var(--card))">
        <h3>⑤ 这些荣誉一律不加分</h3>
        <p class="muted">原文：凡以综合素质测评成绩为依据，或通过非竞赛途径、推荐评比所产生的各种奖励、奖助学金、荣誉不加分。</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          ${m.exclude.map(x => `<span style="font-size:12.5px;padding:4px 12px;border-radius:20px;
            background:rgba(200,16,46,.14);color:var(--red-2);border:1px solid rgba(200,16,46,.3)">${esc(x)}</span>`).join('')}
        </div>
        ${callout('warn', '很多人以为拿了「优秀学生干部」能再加分，其实<b>不能</b>。它本身就是按综测排名评出来的。')}
      </div>

      <div class="card reveal">
        <h3>扣分项目（可累计，扣完为止）</h3>
        ${table(['情形', '扣分'], m.deduct.map(d => [d.t, d.fatal ? `<b style="color:var(--red-2)">${d.v}</b>` : d.v]))}
        ${callout('warn', m.deductNote)}
      </div>`;
  }

  /* ======================== 专业文化 ======================== */
  function renderAcademic() {
    $('#academicNotes').innerHTML = [
      '课程范围：学生<b>上一学年已修的全部课程，公共选修课除外</b>',
      '按等次计分的换算成百分制：优秀=90、良好=80、中=70、合格=60、不合格=0',
      '结果取小数点后 2 位，四舍五入',
      '大四学年若评定周期内课程（公共选修课除外）少于 3 门，则计算该生前 3 个评定周期的全部课程平均学分绩'
    ].map(t => `<li>${t}</li>`).join('');
  }

  /* ======================== 实践创新 ======================== */
  function renderPractice() {
    const p = P.practice;
    let html = `
      <div class="card reveal">
        <h3>基础分（满分 40 分）</h3>
        ${table(['项目', '分值'], p.base.items.map(i => [i.t + (i.note ? ` <span class="sub">（${i.note}）</span>` : ''), i.v]))}
        ${callout('warn', p.base.deduct)}
      </div>
      <div class="card reveal">
        <h3>奖励分（满分 60 分）</h3>
        <p class="muted">这是加分项目最多的一块，也是拉开差距的关键。以下各项累计后封顶 60 分。</p>
        <div id="practiceBonus"></div>
      </div>`;

    $('#practiceBody').innerHTML = html;

    const B = p.bonus;
    $('#practiceBonus').innerHTML = B.map((g, gi) => {
      let inner = '';
      if (g.table) {
        const head = g.table.head;
        const rows = g.table.rows;
        inner += table(head, rows);
      }
      if (g.extra) inner += `<p class="muted" style="margin-top:-4px">${esc(g.extra)}</p>`;
      if (g.list) inner += `<ul class="dot">${g.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
      if (g.rules) inner += `<ul class="dot">${g.rules.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
      if (g.cap) inner += `<p class="muted">本项累计加分不超过 <b>${g.cap}</b> 分。</p>`;
      if (g.note) inner += callout('tip', esc(g.note));
      return `<div style="margin-bottom:26px">
        <h4 style="font-size:14.5px">${gi + 1}. ${esc(g.group)}</h4>${inner}</div>`;
    }).join('');
  }

  /* ======================== 身体心理 ======================== */
  function renderBody() {
    const b = P.body;
    $('#bodyBody').innerHTML = `
      <div class="card reveal">
        <h3>基础分（满分 75 分）</h3>
        ${table(['项目', '分值'], b.base.items.map(i => [i.t, i.v]))}
      </div>
      <div class="card reveal">
        <h3>奖励分（满分 25 分）</h3>
        <h4>① 体育类竞赛</h4>
        ${table(b.sports.head, b.sports.rows)}
        <p class="muted">${esc(b.sports.note)}</p>
        <h4 style="margin-top:20px">② 心理类征文、活动、竞赛</h4>
        ${table(b.psych.head, b.psych.rows)}
        <h4 style="margin-top:20px">③ 早点到出勤率</h4>
        ${table(b.attend.head, b.attend.rows)}
      </div>
      <div class="card reveal">
        <h3>扣分项目</h3>
        ${table(['情形', '扣分'], b.deduct.map(d => [d.t, d.v]))}
      </div>`;
  }

  /* ======================== 部门职位总表 ======================== */
  function renderDepart() {
    // 表 A
    $('#cadreMoralTbl').innerHTML = `
      <thead><tr><th>职务</th><th>考核等级</th><th style="text-align:center">加分</th></tr></thead>
      <tbody>${P.cadreMoral.map(c => `<tr>
        <td>${esc(c.role)}</td>
        <td class="dim">${esc(c.assess)}</td>
        <td class="num ${c.lv >= 10 ? 'hi' : (c.lv === 0 ? 'zero' : '')}">${c.lv}</td>
      </tr>`).join('')}</tbody>`;

    // 表 B
    $('#cadreCreditTbl').innerHTML = `
      <thead><tr><th>职务</th><th>所属部门 / 组织</th><th style="text-align:center">学分</th></tr></thead>
      <tbody>${P.cadreCredit.rows.map(r => `<tr>
        <td>${esc(r.role)}</td>
        <td class="dim">${esc(r.dept)}</td>
        <td class="num">${r.v}</td>
      </tr>`).join('')}
      <tr><td colspan="3" class="dim" style="font-size:12px">${esc(P.cadreCredit.note)}</td></tr>
      </tbody>`;

    // 表 C：按部门
    const lvCls = (l) => l === '院级' ? 'xy' : (l === '班级' ? 'bj' : '');
    $('#departList').innerHTML = P.departments.map(d => `
      <div class="dep">
        <div class="dep-head">
          <span class="dn">${esc(d.name)}</span>
          <span class="dl ${lvCls(d.level)}">${esc(d.level)}</span>
        </div>
        <table>
          <tr class="dep-head-row">
            <td>职位</td>
            <td class="v" style="text-align:center">思想道德<br>加分</td>
            <td class="v" style="text-align:center">第二课堂<br>学分</td>
            <td class="nt">备注</td>
          </tr>
          ${d.roles.map(r => `<tr>
            <td class="role">${esc(r.r)}</td>
            <td class="v m">${r.moral}<span class="lbl">分</span></td>
            <td class="v c">${r.credit}<span class="lbl">学分</span></td>
            <td class="nt">${esc(r.note || '—')}</td>
          </tr>`).join('')}
        </table>
      </div>`).join('');

    // 表 D：考核评分表
    const A = P.cadreAssess;
    let rows = '';
    A.dims.forEach(dim => {
      const itemSum = dim.items.reduce((a, i) => a + i.full, 0);
      const conflict = itemSum !== dim.total;
      dim.items.forEach((it, i) => {
        rows += `<tr>`;
        if (i === 0) {
          rows += `<td rowspan="${dim.items.length}">${dim.name}<br>
            <span class="dim">标注 ${dim.total} 分</span>
            ${conflict ? `<br><span style="font-size:11px;color:var(--red-2)">子项实际 ${itemSum} 分</span>` : ''}
          </td>`;
        }
        rows += `<td>${esc(it.t)}</td>
          <td class="num">${it.full}</td>
          <td class="num">${it.good}</td>
          <td class="num">${it.pass}</td>
          <td class="num zero">${it.fail}</td></tr>`;
      });
    });
    $('#assessTbl').innerHTML = `
      <thead><tr><th>维度</th><th>考核项目</th>
        <th style="text-align:center">标准分</th>
        <th style="text-align:center">优秀</th>
        <th style="text-align:center">称职</th>
        <th style="text-align:center">不称职</th>
      </tr></thead>
      <tbody>${rows}
        <tr><td colspan="2" style="text-align:right;color:var(--gold-2);font-weight:700">合　计</td>
          <td class="num hi">100</td><td class="num">≥90</td><td class="num">≥70</td><td class="num zero">≤69</td></tr>
      </tbody>`;

    $('#assessNote').innerHTML = esc(A.note);
    $('#assessMeta').innerHTML = `
      <h4 style="margin-top:16px">谁给你打分</h4>
      <ul class="dot">${A.who.map(w => `<li><b>${esc(w.g)}</b>：${esc(w.d)}</li>`).join('')}</ul>
      ${callout('tip', esc(A.quota))}
      <p class="muted">${esc(A.misc)}</p>`;
  }

  /* ======================== 第二课堂 ======================== */
  function renderCredit() {
    const S = P.secondClass;
    $('#creditTop').innerHTML = `
      <div class="cbox reveal">
        <div class="big">4 学分</div>
        <div class="lb">毕业最低要求</div>
        <div class="ds">学生必须获取 4 个及以上学分方可毕业；低于 4 分记「不合格」，不可毕业。</div>
      </div>
      <div class="cbox reveal">
        <div class="big">必修 ≥4</div>
        <div class="lb">必修学分下限</div>
        <div class="ds">第六、七、八、九条为必修学分，第十、十一条为选修学分。必修学分总分不得低于 4 个学分。</div>
      </div>
      <div class="cbox reveal">
        <div class="big">4 月 / 9 月</div>
        <div class="lb">认定时间节点</div>
        <div class="ds">活动发起单位每年 4 月认定学分；学分认定管理小组每年 9 月对大四毕业生集体审核。</div>
      </div>`;

    $('#creditGradeList').innerHTML = S.grade.map(g =>
      `<li class="${g.bad ? 'bad' : ''}"><span>${esc(g.range)}</span><b>${esc(g.g)}</b></li>`).join('');

    // 六大类明细
    $('#creditCats').innerHTML = S.categories.map(c => `
      <div class="cat">
        <div class="cat-head">
          <span class="arrow">▶</span>
          <span class="cn2">${esc(c.name)}</span>
          <span class="${c.required ? 'req' : 'opt'}">${c.required ? '必修' : '选修'}</span>
        </div>
        <div class="cat-body">
          <table>${c.items.map(i => `<tr>
            <td>${esc(i.t)}</td>
            <td class="v">${i.v}</td>
            <td class="nt">${i.capNote ? esc(i.capNote) : '—'}</td>
          </tr>`).join('')}</table>
          ${c.note ? `<div style="padding:10px 16px">${callout('tip', esc(c.note))}</div>` : ''}
        </div>
      </div>`).join('');

    $$('#creditCats .cat-head').forEach(h => {
      h.onclick = () => h.parentElement.classList.toggle('open');
    });
  }

  /* ======================== 奖学金 / 评优 ======================== */
  function renderAward() {
    const S = P.scholarship, H = P.honors;
    $('#awardBody').innerHTML = `
      <div class="card reveal">
        <h3>学院奖学金 · 等级与金额</h3>
        ${table(['等级', '金额（每人每学年）', '评定比例'],
          S.levels.map(l => [l.n, `<b style="color:var(--gold-2);font-family:var(--mono)">${l.money} 元</b>`, l.ratio]))}
        <h4 style="margin-top:18px">基本条件</h4>
        <ul class="dot">${S.basic.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <h4 style="margin-top:14px">特等奖学金附加条件</h4>
        <ul class="dot">${S.special.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        ${callout('tip', esc(S.single))}
        ${callout('warn', esc(S.ban))}
      </div>

      <div class="card reveal">
        <h3>创先争优 · 资格条件</h3>
        ${table(['项目', '思想道德', '专业文化', '身体心理', '其他要求', '比例', '奖励'],
          H.rows.map(r => [r.n, r.moral, r.academic, r.body, r.extra, r.ratio,
            `<b style="color:var(--gold-2);font-family:var(--mono)">${r.money} 元</b>`]))}
        ${callout('tip', esc(H.cet))}
        <h4 style="margin-top:16px">优秀毕业生 · 基本条件</h4>
        <ul class="dot">${H.graduate.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <h4 style="margin-top:12px">优秀毕业生 · 还需满足以下之一</h4>
        <ul class="dot">${H.graduateExtra.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`;
  }

  /* ======================== 红线 ======================== */
  function renderRedline() {
    const A = P.academic;
    $('#redlineBody').innerHTML = `
      <div class="card reveal">
        <h3>学业学分关键规则</h3>
        ${table(['事项', '规则'], A.rules.map(r => [r.t, r.v]))}
      </div>
      <div class="two-col">
        <div class="card reveal">
          <h3>授予学士学位的条件</h3>
          <ul class="dot">${A.degree.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        </div>
        <div class="card reveal" style="background:linear-gradient(150deg,rgba(200,16,46,.12),var(--card))">
          <h3>不能授予学士学位的情形</h3>
          <ul class="dot">${A.noDegree.map(x => `<li><b style="color:var(--red-2)">${esc(x)}</b></li>`).join('')}</ul>
        </div>
      </div>
      <div class="card reveal">
        <h3>因考试舞弊受处分后的补救途径</h3>
        <p class="muted">在校期间因考试舞弊曾受记过及以上处分，但受处分后再无其它违纪行为、表现良好且毕业时所受处分已解除者，在毕业时达到以下条件之一，<b>可以申请</b>学士学位授予资格：</p>
        <ul class="dot">${A.remedy.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        ${callout('warn', '补救条件很苛刻——考研上线、学科竞赛省级二等奖以上、核心期刊论文、授权发明专利、参军入伍或考取编制。<b>不要拿学位证去赌。</b>')}
      </div>`;
  }

  /* ======================== 避坑 ======================== */
  const PITS = [
    { h: '以为当学生干部能加很多分', p: '思想道德那套最高 <b>10 分</b>，但换算进总分只占 15%，即 <b>1.5 分</b>；第二课堂那套最高 3 学分。相比专业成绩，投入产出比并不高。' },
    { h: '把"优秀学生干部"当加分项', p: '它属于"以综测成绩为依据产生的荣誉"，<b>明确不加分</b>。同理还有三好学生、文明大学生、优秀志愿者等。' },
    { h: '证书拿到了却忘了申报', p: '原文写明「当时不申报加分的以后不再享受加分」。每学年初测评一定要把原件交上去，<b>过期作废</b>。' },
    { h: '忽视选修课挂科', p: '实践创新基础分里，「选修课程考试不及格每门 <b>减 2 分</b>」；而思想道德扣分、学业警告也都会跟着来。' },
    { h: '体测和早点到不当回事', p: '体能测试不达标或体育课不合格 <b>直接扣 20 分</b>（身体心理总分才 100，占综测 10%，等于总分掉 2 分）；早点到出勤率低于 60% 再扣 5~15 分。' },
    { h: '第二课堂拖到大四才攒', p: '单项分值普遍只有 0.2~1 分，讲座 0.2/次且封顶 1 分，社团 1 分/年。4 学分靠临时突击<b>根本凑不够</b>。' },
    { h: '分不清两套"学分"', p: '课程学分决定能否毕业和学位，第二课堂学分是<b>另一条独立门槛</b>。两者都达标才能毕业，缺一不可。' },
    { h: '以为综测只影响奖学金', p: '综测结果是奖学金、助学金、优秀学生、<b>学生干部选聘、党员发展</b>、各类表彰以及<b>推荐就业</b>的主要依据之一。' }
  ];

  function renderPits() {
    $('#pitGrid').innerHTML = PITS.map((p, i) => `
      <div class="pit reveal">
        <div class="pn">PITFALL ${String(i + 1).padStart(2, '0')}</div>
        <h4>${p.h}</h4>
        <p>${p.p}</p>
      </div>`).join('');
  }

  /* ======================== 行动清单 ======================== */
  const PLAN = [
    { y: '大一 · 上学期', h: '打地基：成绩 + CET-4', items: [
      '把加权平均分做上去——它占综测 <b>60%</b>，比任何加分都划算',
      'C 语言 / Python 是人工智能专业的核心课，务必学扎实',
      '高数、线代打牢，后面机器学习、深度学习全靠它',
      '<b>体育课别挂科、体测要达标</b>，否则直接扣 20 分',
      '开始攒第二课堂：听讲座 0.2/次、志愿服务 0.5/次'
    ]},
    { y: '大一 · 下学期', h: '启动加分项', items: [
      '争取通过 <b>CET-4</b>：综测每年加 5 分，且是三好学生/奖学金/优秀毕业生的硬门槛',
      '递交入党申请书（+5 分），争取成为入党积极分子（+8 分）',
      '报名一个社团或竞选班委（第二课堂 0.5~2 学分）',
      '关注学院竞赛通知，先当参与者（参赛即有 0.5~2 学分）'
    ]},
    { y: '大二', h: '拉开差距', items: [
      '过 <b>CET-6</b>（综测每年加 10 分，第二课堂 1 学分）',
      '考计算机等级证书（二级 0.5 学分 / 三级 1 学分；综测每证 10 分，封顶 20 分）',
      '冲击学科竞赛奖项——国家级一等 <b>综测 20 分</b> + <b>第二课堂 4 学分</b>',
      '争取学生干部考核「优秀」，两套分值都能上一档'
    ]},
    { y: '大三', h: '深化与产出', items: [
      '尝试发表论文或申请专利（软著 2 学分、实用新型 3 学分、发明专利 5 学分）',
      '参加「挑战杯 / 创青春 / 互联网+」——<b>A 类竞赛学分翻倍</b>',
      '核对第二课堂学分余额，缺口大的话抓紧补',
      '争取党员转正（思想道德 +10 分）'
    ]},
    { y: '大四', h: '收口', items: [
      '完成就业登记，实践创新基础分 <b>+20 分</b>',
      '确认第二课堂已满 <b>4 学分</b>（9 月学校会集体审核）',
      '核对无累计不及格学分 ≥35 的降级/退学风险',
      '确认无考试舞弊等影响学位授予的记录'
    ]}
  ];

  function renderPlan() {
    $('#timeline').innerHTML = PLAN.map(p => `
      <div class="tl reveal">
        <div class="ty">${esc(p.y)}</div>
        <h4>${esc(p.h)}</h4>
        <ul>${p.items.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>`).join('');
  }

  /* ======================== 来源 ======================== */
  function renderSrc() {
    const items = [
      ['学生手册（第二十一版·2025）', 'http://www.stcnchu.edu.cn/xxgk/xsglfwxx/content_29143'],
      ['学生手册（第十九版·2023）', 'http://www.stcnchu.edu.cn/xxgk/xsglfwxx/content_23794'],
      ['学生管理服务信息栏目', 'http://www.stcnchu.edu.cn/xxgk/xsglfwxx'],
      ['学生工作部（处）· 学工文件', 'http://xg.stcnchu.edu.cn/xgwj'],
      ['教务科研处 · 规章制度', 'http://jw.stcnchu.edu.cn/gzzd'],
      ['招生信息网 · 专业介绍', 'http://zs.stcnchu.edu.cn/zyjs']
    ];
    $('#srcList').innerHTML = items.map(([t, u]) =>
      `<li>${esc(t)}：<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a></li>`).join('') +
      `<li>核心条款定位：综合素质测评办法（手册第 182 页起）、第二课堂学分管理办法（第 245 页起）、
        学生干部考核暂行办法（第 260 页起）、学士学位授予实施细则（第 113 页起）</li>`;
  }

  /* ==========================================================================
   *  综测计算器
   * ========================================================================*/
  const ST = {
    academic: '',
    party: 0, cadre: 0, brave: 0,
    awards: [],          // {cat,label,v}
    moralDeduct: 0,
    practiceBase: [false, false, false],   // 基础分三项勾选状态
    contest: [], paper: [], book: [], research: [], article: [],
    cet4: 0, cet6: 0, certN: 0, employment: false,
    practiceFail: 0,
    sports: [], psych: [], attend: 0, bodyDeduct: 0,
    grades: []           // {score, credit} 辅助计算
  };

  function sum(arr) { return arr.reduce((a, b) => a + b.v, 0); }

  function calcMoral() {
    const bonus = ST.party + ST.cadre + ST.brave + sum(ST.awards);
    const capped = Math.min(P.moral.bonusCap, bonus);
    const v = Math.max(0, Math.min(100, P.moral.base.total + capped - ST.moralDeduct));
    return { v, bonus, capped, raw: P.moral.base.total + capped - ST.moralDeduct };
  }

  function calcAcademic() {
    const v = ST.academic === '' ? 0 : Math.max(0, Math.min(100, Number(ST.academic)));
    return { v };
  }

  function calcPractice() {
    const BASEV = [10, 10, 10];
    const baseChk = ST.practiceBase.reduce((a, on, i) => a + (on ? BASEV[i] : 0), 0);
    const emp = ST.employment ? 20 : 0;
    const base = Math.min(40, baseChk + emp) - ST.practiceFail * 2;
    const bContest = sum(ST.contest), bPaper = sum(ST.paper), bBook = sum(ST.book),
          bResearch = sum(ST.research);
    const bArticle = Math.min(20, sum(ST.article));
    const bCert = Math.min(20, ST.cet4 * 5 + ST.cet6 * 10 + ST.certN * 10);
    const bonusRaw = bContest + bPaper + bBook + bResearch + bArticle + bCert;
    const bonus = Math.min(P.practice.bonusCap, bonusRaw);
    const raw = base + bonus;
    return { v: Math.max(0, Math.min(100, raw)), base, bonus, bonusRaw, raw };
  }

  function calcBody() {
    const bonusRaw = sum(ST.sports) + sum(ST.psych) + ST.attend;
    const bonus = Math.min(P.body.bonusCap, bonusRaw);
    const raw = P.body.base.total + bonus - ST.bodyDeduct;
    return { v: Math.max(0, Math.min(100, raw)), bonus, bonusRaw, raw };
  }

  function calcTotal() {
    const m = calcMoral(), a = calcAcademic(), p = calcPractice(), b = calcBody();
    const total = m.v * 0.15 + a.v * 0.60 + p.v * 0.15 + b.v * 0.10;
    return { m, a, p, b, total };
  }

  /* -------- 计算器 UI 构件 -------- */
  function grp(id, title, badge, desc, bodyHtml, open) {
    return `<div class="cgrp ${open ? 'open' : ''}" data-g="${id}">
      <div class="cgrp-head">
        <h4><span class="arrow">▶</span>${title}</h4>
        <span class="badge">${badge}</span>
      </div>
      <div class="cgrp-body">${desc ? `<div class="cgrp-desc">${desc}</div>` : ''}${bodyHtml}</div>
    </div>`;
  }

  function chkItem(scope, key, label, value, note, checked) {
    return `<label class="citem">
      <input type="checkbox" data-scope="${scope}" data-key="${key}" data-v="${value}" ${checked ? 'checked' : ''}>
      <span class="ct">${label}${note ? `<span class="cn">${note}</span>` : ''}</span>
      <span class="cv">+${value}</span>
    </label>`;
  }

  function radioItem(scope, label, value, note, checked) {
    return `<label class="citem">
      <input type="radio" name="${scope}" data-scope="${scope}" data-key="__radio" data-v="${value}" ${checked ? 'checked' : ''}>
      <span class="ct">${label}${note ? `<span class="cn">${note}</span>` : ''}</span>
      <span class="cv">+${value}</span>
    </label>`;
  }

  // 可点击的表格：点单元格即加分
  function pickTable(scope, head, rows, isFirstLabel) {
    const th = head.map(h => `<th>${esc(h)}</th>`).join('');
    const tb = rows.map(r => '<tr>' + r.map((c, i) => {
      if (i === 0) return `<td class="dim">${esc(c)}</td>`;
      return `<td class="num" style="cursor:pointer" data-pick="${scope}" data-v="${c}"
        data-label="${esc(r[0])} · ${esc(head[i])}" title="点击加分">${c}</td>`;
    }).join('') + '</tr>').join('');
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`;
  }

  function pickedList(scope, arr) {
    if (!arr.length) return `<p class="muted" style="margin:4px 0 0 11px">尚未选择（点击上方表格中的数字即可加分）</p>`;
    return `<div style="margin:6px 0 0 11px;display:flex;flex-wrap:wrap;gap:7px">
      ${arr.map((x, i) => `<span style="font-size:12.2px;padding:4px 10px;border-radius:20px;
        background:rgba(198,161,91,.14);border:1px solid var(--line-2);color:var(--gold-2)">
        ${esc(x.label)} <b style="font-family:var(--mono)">+${x.v}</b>
        <span data-del="${scope}" data-i="${i}" style="cursor:pointer;color:var(--red-2);margin-left:5px">✕</span>
      </span>`).join('')}
    </div>`;
  }

  function renderCalc() {
    const m = P.moral, pr = P.practice, b = P.body;

    // ① 专业文化
    const gradeRows = ST.grades.map((g, i) => `
      <div class="nrow" style="padding:5px 11px">
        <input type="number" placeholder="成绩" value="${g.score}" data-gi="${i}" data-gf="score" style="width:78px">
        <span class="unit">分 ×</span>
        <input type="number" placeholder="学分" value="${g.credit}" data-gi="${i}" data-gf="credit" style="width:78px">
        <span class="unit">学分</span>
        <span style="margin-left:auto;cursor:pointer;color:var(--red-2)" data-gdel="${i}">✕</span>
      </div>`).join('');

    const g1 = grp('academic', '专业文化素质 <span class="pct-tag blue">60%</span>',
      '权重最高',
      '直接填写你的加权平均分。不知道的话，用下面的小工具按课程算。',
      `<div class="nrow">
        <label>加权平均分（总平均学分值）</label>
        <input type="number" id="inAcademic" min="0" max="100" step="0.01"
          value="${ST.academic}" placeholder="0-100">
        <span class="unit">分</span>
      </div>
      <div class="cgrp-desc" style="margin-top:14px">按课程计算（可选）：录入成绩与学分，自动算出加权平均分</div>
      <div id="gradeList">${gradeRows}</div>
      <div style="display:flex;gap:9px;margin-top:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" id="gradeAdd" style="padding:8px 16px;font-size:13px">+ 添加一门课</button>
        <button class="btn btn-gold" id="gradeApply" style="padding:8px 16px;font-size:13px">算好并填入上方</button>
      </div>
      <div id="gradeOut" class="muted" style="margin-top:8px"></div>`, true);

    // ② 思想道德
    const cadreOpts = P.cadreMoral.map((c, i) =>
      `<option value="${c.lv}" ${ST.cadre === c.lv ? 'selected' : ''}>${c.lv} 分 — ${esc(c.role)}（${esc(c.assess)}）</option>`
    ).join('');

    const g2 = grp('moral', '思想道德素质 <span class="pct-tag red">15%</span>',
      `奖励 +${calcMoral().capped} / 30`,
      '基础分 70 分固定；奖励分封顶 30 分；扣分可累计。',
      `<div class="nrow"><label>基础分（固定）</label><span class="cv" style="font-family:var(--mono);color:var(--gold-2)">70</span></div>

      <div class="cgrp-desc" style="margin-top:12px">① 向党组织靠拢（按最高档取一项）</div>
      ${radioItem('party', '未申请', 0, '', ST.party === 0)}
      ${radioItem('party', '递交入党申请书且按时提交思想汇报', 5, '', ST.party === 5)}
      ${radioItem('party', '入党积极分子并按时提交思想汇报', 8, '', ST.party === 8)}
      ${radioItem('party', '中共（预备）党员，考核合格', 10, '', ST.party === 10)}

      <div class="cgrp-desc" style="margin-top:14px">② 担任学生干部（就高不累加，最高 10 分）</div>
      <div class="nrow">
        <label>选择你的职务与考核等级</label>
        <select id="inCadre" style="flex:1;min-width:220px;padding:8px 11px;border-radius:9px;
          background:rgba(0,0,0,.4);border:1px solid var(--line-2);color:var(--gold-2);font-size:13px">
          <option value="0" ${ST.cadre === 0 ? 'selected' : ''}>0 分 — 未任职 / 考核不称职</option>
          ${cadreOpts}
        </select>
      </div>

      <div class="cgrp-desc" style="margin-top:14px">③ 见义勇为、助人为乐（需有表彰或报道）</div>
      <div class="nrow">
        <label>选择级别</label>
        <select id="inBrave" style="flex:1;min-width:200px;padding:8px 11px;border-radius:9px;
          background:rgba(0,0,0,.4);border:1px solid var(--line-2);color:var(--gold-2);font-size:13px">
          ${[[0, '无'], [2, '院级（最高 2 分）'], [5, '校级（最高 5 分）'], [10, '省级（最高 10 分）'], [15, '国家级（最高 15 分）']]
            .map(([v, t]) => `<option value="${v}" ${ST.brave === v ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>

      <div class="cgrp-desc" style="margin-top:14px">④ 争先创优、文明评比获表彰（点击表格中的数字加分，可累加不同活动）</div>
      ${pickTable('awards', ['等次', '国家级', '省级', '学院', '学部'], [
        ['一', 20, 10, 6, 4], ['二', 15, 8, 5, 3], ['三', 12, 6, 4, 2], ['鼓励', 8, 4, 3, 1]
      ])}
      ${pickedList('awards', ST.awards)}
      ${callout('tip', '协会或行业组织主办的活动减半；未分等次按二等计；集体项目其他成员减半。')}

      <div class="nrow" style="margin-top:12px">
        <label>扣分合计（处分、缺勤、通报批评等）</label>
        <input type="number" id="inMoralDeduct" min="0" value="${ST.moralDeduct}">
        <span class="unit">分</span>
      </div>`);

    // ③ 实践创新
    const baseItems = [
      '课外小实验、小制作、小论文竞赛等课外学术科技活动',
      '学校要求参加的有关学科实验及专业实习',
      '各种社会实践活动'
    ].map((t, i) => `<label class="citem">
      <input type="checkbox" data-pb="${i}" ${ST.practiceBase[i] ? 'checked' : ''}>
      <span class="ct">${esc(t)}</span>
      <span class="cv">+10</span>
    </label>`).join('');

    const g3 = grp('practice', '实践创新素质 <span class="pct-tag teal">15%</span>',
      `奖励 +${calcPractice().bonus} / 60`,
      '基础分满分 40；奖励分满分 60。加分项目最多的一块。',
      `<div class="cgrp-desc">基础分（满分 40 分）</div>
      ${baseItems}
      ${chkItem('pemp', '就业登记', '大四学年已在就业系统完成就业登记', 20, '仅大四学年', ST.employment)}
      <div class="nrow">
        <label>选修课挂科门数（每门 −2 分）</label>
        <input type="number" id="inPracticeFail" min="0" value="${ST.practiceFail}">
        <span class="unit">门</span>
      </div>

      <div class="cgrp-desc" style="margin-top:16px">① 学科竞赛获奖（点击加分）</div>
      ${pickTable('contest', ['等次', '国家级', '省级', '学院', '学部'], [
        ['一等', 20, 10, 6, 4], ['二等', 15, 8, 5, 3], ['三等', 12, 6, 4, 2], ['其他', 8, 4, 3, 1]
      ])}
      ${pickedList('contest', ST.contest)}

      <div class="cgrp-desc" style="margin-top:16px">② 发表学术论文（第一作者）</div>
      ${pickTable('paper', ['刊物级别', '加分'], [
        ['SCI / SSCI / EI / CSSCI', 30], ['北大核心 / ISTP(CPCI)', 20],
        ['省级', 15], ['学术论文集（省级以上）', 10]
      ])}
      ${pickedList('paper', ST.paper)}

      <div class="cgrp-desc" style="margin-top:16px">③ 出版著作</div>
      ${pickTable('book', ['类别', '≥10万字', '<10万字', '≥5万字', '≥1万字', '<1万字'], [
        ['独（合）著', 20, 12, 12, 8, 5],
        ['主（参）编', 15, 15, 12, 8, 5]
      ])}
      ${pickedList('book', ST.book)}

      <div class="cgrp-desc" style="margin-top:16px">④ 科研成果与科技发明</div>
      ${pickTable('research', ['等级', '国际级', '国家级', '省级', '市厅、校级'], [
        ['一', 40, 30, 20, 15], ['二', 30, 25, 15, 10], ['三', 25, 20, 10, 5],
        ['优秀', 20, 15, 8, 3], ['鉴定成果（前三名）', 20, 15, 10, 5], ['发明专利', 15, 15, 15, 15]
      ])}
      ${pickedList('research', ST.research)}

      <div class="cgrp-desc" style="margin-top:16px">⑤ 发表文学、艺术、新闻作品（本项封顶 20 分）</div>
      ${pickTable('article', ['发表媒体', '≥1500字', '600-1500字', '<600字'], [
        ['国家级权威报刊或新闻媒体', 15, 12, 8], ['省级重要报纸或新闻媒体', 12, 8, 5],
        ['公开发行的地市级报刊或地方新闻媒体', 8, 5, 3], ['学校主办的其他报纸或媒体', 5, 3, 2],
        ['学校部门主办的内部刊物', 5, 3, 2]
      ])}
      ${pickedList('article', ST.article)}

      <div class="cgrp-desc" style="margin-top:16px">⑥ 专业技能 / 职业技能证书（本项封顶 20 分）</div>
      <div class="nrow">
        <label>非英语专业 CET-4 合格（每年 +5 分）</label>
        <input type="number" id="inCET4" min="0" max="4" value="${ST.cet4 || 0}" style="width:70px">
        <span class="unit">年</span>
      </div>
      <div class="nrow">
        <label>非英语专业 CET-6 合格（每年 +10 分）</label>
        <input type="number" id="inCET6" min="0" max="4" value="${ST.cet6 || 0}" style="width:70px">
        <span class="unit">年</span>
      </div>
      <div class="nrow">
        <label>其他专业技能 / 职业技能证书（每证 10 分）</label>
        <input type="number" id="inCertN" min="0" max="5" value="${ST.certN || 0}" style="width:70px">
        <span class="unit">个</span>
      </div>
      <p class="muted" style="margin-left:11px">驾驶证不计入；同类分等级证书按最高级加 10 分，每低一级减 2 分。</p>`);

    // ④ 身体心理
    const g4 = grp('body', '身体心理素质 <span class="pct-tag gold">10%</span>',
      `奖励 +${calcBody().bonus} / 25`,
      '基础分 75 分固定；奖励分封顶 25 分。',
      `<div class="nrow"><label>基础分（固定）</label><span class="cv" style="font-family:var(--mono);color:var(--gold-2)">75</span></div>

      <div class="cgrp-desc" style="margin-top:12px">① 体育类竞赛（点击加分）</div>
      ${pickTable('sports', b.sports.head, b.sports.rows)}
      ${pickedList('sports', ST.sports)}

      <div class="cgrp-desc" style="margin-top:16px">② 心理类征文、活动、竞赛</div>
      ${pickTable('psych', b.psych.head, b.psych.rows)}
      ${pickedList('psych', ST.psych)}

      <div class="cgrp-desc" style="margin-top:16px">③ 早点到出勤率</div>
      <div class="nrow">
        <label>出勤率档次</label>
        <select id="inAttend" style="flex:1;min-width:200px;padding:8px 11px;border-radius:9px;
          background:rgba(0,0,0,.4);border:1px solid var(--line-2);color:var(--gold-2);font-size:13px">
          ${[[0, '低于 60%（无加分，见下方扣分）'], [12, '69%~60%（+12）'], [14, '79%~70%（+14）'],
             [16, '89%~80%（+16）'], [18, '99%~90%（+18）'], [20, '100%（+20）']]
            .map(([v, t]) => `<option value="${v}" ${ST.attend === v ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>

      <div class="nrow" style="margin-top:12px">
        <label>扣分合计（体测不达标/体育不合格 −20；出勤率低 −5~15）</label>
        <input type="number" id="inBodyDeduct" min="0" value="${ST.bodyDeduct}">
        <span class="unit">分</span>
      </div>`);

    $('#calcPanel').innerHTML = g1 + g2 + g3 + g4;
    bindCalc();
    updateScore();
  }

  function bindCalc() {
    const panel = $('#calcPanel');

    // 折叠
    $$('.cgrp-head', panel).forEach(h => {
      h.onclick = () => h.parentElement.classList.toggle('open');
    });

    // 专业分
    const inA = $('#inAcademic');
    if (inA) inA.oninput = () => { ST.academic = inA.value; updateScore(); };

    // 加权计算器
    const gl = $('#gradeList');
    function renderGrades() {
      if (!gl) return;
      gl.innerHTML = ST.grades.map((g, i) => `
        <div class="nrow" style="padding:5px 11px">
          <input type="number" placeholder="成绩" value="${g.score}" data-gi="${i}" data-gf="score" style="width:78px">
          <span class="unit">分 ×</span>
          <input type="number" placeholder="学分" value="${g.credit}" data-gi="${i}" data-gf="credit" style="width:78px">
          <span class="unit">学分</span>
          <span style="margin-left:auto;cursor:pointer;color:var(--red-2)" data-gdel="${i}">✕</span>
        </div>`).join('');
      $$('#gradeList input').forEach(inp => {
        inp.oninput = () => {
          const i = +inp.dataset.gi, f = inp.dataset.gf;
          ST.grades[i][f] = inp.value;
        };
      });
      $$('#gradeList [data-gdel]').forEach(x => {
        x.onclick = () => { ST.grades.splice(+x.dataset.gdel, 1); renderGrades(); };
      });
    }
    renderGrades();

    const ga = $('#gradeAdd');
    if (ga) ga.onclick = () => { ST.grades.push({ score: '', credit: '' }); renderGrades(); };

    const gap = $('#gradeApply');
    if (gap) gap.onclick = () => {
      let sw = 0, sc = 0;
      ST.grades.forEach(g => {
        const s = parseFloat(g.score), c = parseFloat(g.credit);
        if (!isNaN(s) && !isNaN(c) && c > 0) { sw += s * c; sc += c; }
      });
      const out = $('#gradeOut');
      if (sc <= 0) { out.innerHTML = '<b style="color:var(--red-2)">请先填写有效的成绩与学分</b>'; return; }
      const avg = sw / sc;
      ST.academic = avg.toFixed(2);
      if (inA) inA.value = ST.academic;
      out.innerHTML = `已计算：总学分 ${num1(sc)}，加权平均分 <b style="color:var(--gold-2)">${num(avg)}</b>，已填入上方`;
      updateScore();
    };

    // 单选组（入党）
    $$('input[type=radio][data-scope=party]', panel).forEach(r => {
      r.onchange = () => { ST.party = +r.dataset.v; renderCalc(); };
    });

    // 干部 / 见义勇为
    const inC = $('#inCadre');
    if (inC) inC.onchange = () => { ST.cadre = +inC.value; renderCalc(); };
    const inB = $('#inBrave');
    if (inB) inB.onchange = () => { ST.brave = +inB.value; renderCalc(); };

    // 扣分
    const bindNum = (sel, key) => {
      const el = $(sel);
      if (el) el.oninput = () => { ST[key] = Math.max(0, +el.value || 0); updateScore(); };
    };
    bindNum('#inMoralDeduct', 'moralDeduct');
    bindNum('#inPracticeFail', 'practiceFail');
    bindNum('#inBodyDeduct', 'bodyDeduct');

    // 实践基础勾选
    $$('input[data-pb]', panel).forEach(c => {
      c.onchange = () => {
        ST.practiceBase[+c.dataset.pb] = c.checked;
        updateScore();
      };
    });
    const emp = $('input[data-scope=pemp]', panel);
    if (emp) emp.onchange = () => { ST.employment = emp.checked; updateScore(); };

    // 证书
    const c4 = $('#inCET4'), c6 = $('#inCET6'), cn = $('#inCertN');
    function syncCert() {
      ST.cet4 = Math.max(0, +c4.value || 0);
      ST.cet6 = Math.max(0, +c6.value || 0);
      ST.certN = Math.max(0, +cn.value || 0);
      updateScore();
    }
    if (c4) c4.oninput = syncCert;
    if (c6) c6.oninput = syncCert;
    if (cn) cn.oninput = syncCert;

    // 出勤
    const at = $('#inAttend');
    if (at) at.onchange = () => { ST.attend = +at.value; updateScore(); };

    // 点击加分表格
    $$('[data-pick]', panel).forEach(td => {
      td.onclick = () => {
        const scope = td.dataset.pick;
        if (!Array.isArray(ST[scope])) return;
        ST[scope].push({ label: td.dataset.label, v: +td.dataset.v });
        renderCalc();
      };
    });
    // 删除已选项
    $$('[data-del]', panel).forEach(x => {
      x.onclick = () => {
        const scope = x.dataset.del, i = +x.dataset.i;
        if (Array.isArray(ST[scope])) { ST[scope].splice(i, 1); renderCalc(); }
      };
    });
  }

  function updateScore() {
    const r = calcTotal();
    animateNum($('#scoreNum'), r.total, 2);

    const rows = [
      ['思想道德', r.m.v, 15, '#FF6B8A'],
      ['专业文化', r.a.v, 60, '#4FD1FF'],
      ['实践创新', r.p.v, 15, '#2FE0D0'],
      ['身体心理', r.b.v, 10, '#FFC661']
    ];
    $('#scoreBars').innerHTML = rows.map(([n, v, w, c]) => `
      <div class="sbar">
        <div class="t"><span>${n} ×${w}%</span><b>${num(v)} → +${num(v * w / 100)}</b></div>
        <div class="bar"><span style="width:${Math.max(0, Math.min(100, v))}%;background:${c};color:${c}"></span></div>
      </div>`).join('');

    const notes = [];
    if (r.m.bonus > P.moral.bonusCap) notes.push('思想道德奖励分已封顶 30 分');
    if (r.p.bonusRaw > P.practice.bonusCap) notes.push('实践创新奖励分已封顶 60 分');
    if (r.b.bonusRaw > P.body.bonusCap) notes.push('身体心理奖励分已封顶 25 分');
    notes.push(`思想道德 ${num(r.m.v)}／专业文化 ${num(r.a.v)}／实践创新 ${num(r.p.v)}／身体心理 ${num(r.b.v)}`);
    $('#scoreNote').innerHTML = notes.join('；');

    // 同步分组徽标
    const bm = $('[data-g="moral"] .badge');
    if (bm) bm.textContent = `奖励 +${r.m.capped} / 30`;
    const bp = $('[data-g="practice"] .badge');
    if (bp) bp.textContent = `奖励 +${r.p.bonus} / 60`;
    const bb = $('[data-g="body"] .badge');
    if (bb) bb.textContent = `奖励 +${r.b.bonus} / 25`;

    // 记录用于复制
    updateScore._last = r;
  }

  /* 复制综测结果到剪贴板 */
  function copyScore() {
    const r = updateScore._last;
    if (!r) return;
    const txt = [
      '【综测分测算结果】',
      `综合素质测评总分：${num(r.total)} / 100`,
      '',
      `思想道德素质：${num(r.m.v)}  ×15% = +${num(r.m.v * 0.15)}`,
      `专业文化素质：${num(r.a.v)}  ×60% = +${num(r.a.v * 0.60)}`,
      `实践创新素质：${num(r.p.v)}  ×15% = +${num(r.p.v * 0.15)}`,
      `身体心理素质：${num(r.b.v)}  ×10% = +${num(r.b.v * 0.10)}`,
      '',
      '（依据南昌航空大学科技学院学生手册 综合素质测评办法 测算，仅供参考）'
    ].join('\n');
    const done = (ok) => {
      const b = $('#copyScore');
      if (!b) return;
      const old = b.textContent;
      b.textContent = ok ? '✓ 已复制' : '复制失败';
      setTimeout(() => { b.textContent = old; }, 1600);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(txt).then(() => done(true)).catch(() => done(false));
    } else {
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      done(ok);
    }
  }

  /* ==========================================================================
   *  第二课堂学分计算器
   * ========================================================================*/
  const CS = {};   // key -> {checked:bool} 或 {count:number}

  function creditKey(ci, ii) { return ci + '_' + ii; }

  function calcCredit() {
    const S = P.secondClass;
    let required = 0, elective = 0;
    const detail = [];
    S.categories.forEach((c, ci) => {
      c.items.forEach((it, ii) => {
        const k = creditKey(ci, ii);
        const st = CS[k];
        if (!st) return;
        let v = 0;
        if (it.cap) {
          const n = Math.max(0, Math.min(st.count || 0, Math.floor(it.cap / it.v)));
          v = Math.min(it.cap, n * it.v);
        } else if (st.checked) {
          v = it.v;
        }
        if (v > 0) {
          if (c.required) required += v; else elective += v;
          detail.push({ cat: c.name, t: it.t, v });
        }
      });
    });
    const total = required + elective;
    return { required, elective, total, detail };
  }

  function renderCreditCalc() {
    const S = P.secondClass;
    const html = S.categories.map((c, ci) => {
      const items = c.items.map((it, ii) => {
        const k = creditKey(ci, ii);
        const st = CS[k] || (it.cap ? { count: 0 } : { checked: false });
        if (it.cap) {
          const max = Math.floor(it.cap / it.v);
          return `<div class="nrow">
            <label>${esc(it.t)}<span class="cn" style="display:block;font-size:11.5px;color:var(--txt-3)">
              每单位 ${it.v} 学分${it.capNote ? '，' + esc(it.capNote) : ''}</span></label>
            <input type="number" min="0" max="${max}" value="${st.count || 0}"
              data-cc="${ci}" data-ci="${ii}">
            <span class="unit">次 / 个</span>
          </div>`;
        }
        return `<label class="citem">
          <input type="checkbox" data-cb="${ci}" data-ci="${ii}" ${st.checked ? 'checked' : ''}>
          <span class="ct">${esc(it.t)}</span>
          <span class="cv">+${it.v}</span>
        </label>`;
      }).join('');

      return `<div class="cgrp ${ci < 2 ? 'open' : ''}" data-cg="${ci}">
        <div class="cgrp-head">
          <h4><span class="arrow">▶</span>${esc(c.name)}</h4>
          <span class="badge">${c.required ? '必修' : '选修'}</span>
        </div>
        <div class="cgrp-body">
          ${c.note ? `<div class="cgrp-desc">${esc(c.note)}</div>` : ''}
          ${items}
        </div>
      </div>`;
    }).join('');

    $('#creditPanel').innerHTML = html;

    $$('#creditPanel .cgrp-head').forEach(h => {
      h.onclick = () => h.parentElement.classList.toggle('open');
    });
    $$('#creditPanel input[type=checkbox]').forEach(c => {
      c.onchange = () => {
        const k = creditKey(c.dataset.cb, c.dataset.ci);
        CS[k] = { checked: c.checked };
        updateCredit();
      };
    });
    $$('#creditPanel input[type=number]').forEach(n => {
      n.oninput = () => {
        const k = creditKey(n.dataset.cc, n.dataset.ci);
        CS[k] = { count: Math.max(0, +n.value || 0) };
        updateCredit();
      };
    });
    updateCredit();
  }

  function updateCredit() {
    const r = calcCredit();
    animateNum($('#creditNum'), r.total, 1);

    const g = r.total >= 6 ? '优秀' : (r.total >= 4 ? (r.total > 4 ? '良好' : '合格') : '不合格（不可毕业）');
    const gc = r.total < 4 ? 'var(--rose)' : 'var(--cyan-2)';
    $('#creditGrade').innerHTML = `成绩记载：<b style="color:${gc}">${g}</b>`;
    $('#creditBar').style.width = Math.min(100, r.total / 6 * 100) + '%';

    const need = Math.max(0, 4 - r.total);
    let note = `必修 ${num1(r.required)} 学分 ＋ 选修 ${num1(r.elective)} 学分`;
    if (r.total < 4) note += `<br><b style="color:var(--rose)">距离毕业线还差 ${num1(need)} 学分</b>`;
    else note += `<br><b style="color:var(--teal)">已达标（≥4 学分）</b>`;
    if (r.required < 4 && r.total >= 4) {
      note += `<br><span style="color:var(--amber)">注意：必修学分 ${num1(r.required)} 低于 4，需靠必修项目补足</span>`;
    }
    $('#creditNote').innerHTML = note;
    updateCredit._last = r;
  }

  /* 复制学分结果 */
  function copyCredit() {
    const r = updateCredit._last;
    if (!r) return;
    const g = r.total >= 6 ? '优秀' : (r.total >= 4 ? (r.total > 4 ? '良好' : '合格') : '不合格（不可毕业）');
    const lines = [
      '【第二课堂学分测算结果】',
      `已获学分：${num1(r.total)} 学分`,
      `成绩记载：${g}`,
      `必修 ${num1(r.required)} 学分 ＋ 选修 ${num1(r.elective)} 学分`,
      r.total < 4 ? `距离毕业线（4 学分）还差 ${num1(4 - r.total)} 学分` : '已达标（≥4 学分）',
      ''
    ];
    if (r.detail.length) {
      lines.push('明细：');
      r.detail.forEach(d => lines.push(`  · [${d.cat}] ${d.t}  +${d.v}`));
      lines.push('');
    }
    lines.push('（依据南昌航空大学科技学院学生手册 第二课堂学分管理办法 测算，仅供参考）');
    const txt = lines.join('\n');
    const done = (ok) => {
      const b = $('#copyCredit');
      if (!b) return;
      const old = b.textContent;
      b.textContent = ok ? '✓ 已复制' : '复制失败';
      setTimeout(() => { b.textContent = old; }, 1600);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(txt).then(() => done(true)).catch(() => done(false));
    } else {
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      done(ok);
    }
  }

  /* ======================== 启动 ======================== */
  function init() {
    buildNav();
    renderHero();
    renderKeys();
    renderWeights();
    renderCalc();
    renderMoral();
    renderAcademic();
    renderPractice();
    renderBody();
    renderDepart();
    renderCredit();
    renderCreditCalc();
    renderAward();
    renderRedline();
    renderPits();
    renderPlan();
    renderSrc();

    // 重置按钮
    $('#calcReset').onclick = () => {
      Object.assign(ST, {
        academic: '', party: 0, cadre: 0, brave: 0, awards: [], moralDeduct: 0,
        practiceBase: [], contest: [], paper: [], book: [], research: [], article: [],
        cert: [], cet4: 0, cet6: 0, certN: 0, employment: false, practiceFail: 0,
        sports: [], psych: [], attend: 0, bodyDeduct: 0, grades: []
      });
      renderCalc();
    };
    $('#creditReset').onclick = () => {
      Object.keys(CS).forEach(k => delete CS[k]);
      renderCreditCalc();
    };

    // 复制按钮
    const cs = $('#copyScore');
    if (cs) cs.onclick = copyScore;
    const cc = $('#copyCredit');
    if (cc) cc.onclick = copyCredit;

    // 回到顶部
    const tt = document.createElement('div');
    tt.className = 'totop';
    tt.id = 'totop';
    tt.textContent = '↑';
    tt.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(tt);

    initScrollSpy();
    initReveal();
    initShortcuts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else init();
})();
