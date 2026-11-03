# -*- coding: utf-8 -*-
"""
1.0 低保真原型图生成器（wireframe）
输出：product/prototype/png/*.png  1440x900
依据：product/需求.md、docs/技术约束.md
运行：python product/prototype/build_prototype.py
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'png')
os.makedirs(OUT, exist_ok=True)

W, H = 1440, 900
BG = (246, 247, 249)
CARD = (255, 255, 255)
BORDER = (223, 227, 234)
TEXT = (28, 37, 50)
SUB = (90, 101, 116)
MUTED = (150, 158, 170)
ACCENT = (37, 99, 235)
ACCENT_BG = (232, 239, 254)
OK = (22, 150, 74)
OK_BG = (232, 245, 236)
WARN_TX = (150, 92, 12)
WARN_BG = (255, 248, 233)
WARN_BD = (240, 199, 122)
DASH_BD = (196, 203, 214)
FILL = (241, 243, 247)
BAR = (206, 213, 222)

FD = r'C:\Windows\Fonts'
REG = os.path.join(FD, 'msyh.ttc')
BOLD = os.path.join(FD, 'msyhbd.ttc')
if not os.path.exists(BOLD):
    BOLD = REG


def F(sz, b=False):
    return ImageFont.truetype(BOLD if b else REG, sz)


f_title = F(30, True)
f_h2 = F(18, True)
f_h3 = F(15, True)
f_body = F(14)
f_bold = F(14, True)
f_small = F(12)
f_tiny = F(11)
f_big = F(52, True)
f_num = F(24, True)


def tw(d, s, f):
    return d.textlength(s, font=f)


def wrap(d, s, f, maxw):
    out, cur = [], ''
    for ch in s:
        if ch == '\n':
            out.append(cur); cur = ''; continue
        if tw(d, cur + ch, f) > maxw and cur:
            out.append(cur); cur = ch
        else:
            cur += ch
    if cur:
        out.append(cur)
    return out


def rrect(d, box, r=10, fill=CARD, outline=BORDER, width=1):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def text(d, xy, s, f=f_body, fill=TEXT, maxw=None, lh=None):
    x, y = xy
    if maxw is None:
        d.text((x, y), s, font=f, fill=fill)
        return y + f.size + 8
    step = lh or (f.size + 7)
    for i, ln in enumerate(wrap(d, s, f, maxw)):
        d.text((x, y + i * step), ln, font=f, fill=fill)
    return y + len(wrap(d, s, f, maxw)) * step


def pill(d, xy, s, f=f_small, bg=ACCENT_BG, fg=ACCENT, bd=None, padx=10, pady=5):
    x, y = xy
    w = tw(d, s, f) + padx * 2
    h = f.size + pady * 2
    rrect(d, (x, y, x + w, y + h), r=h // 2, fill=bg, outline=bd or bg)
    d.text((x + padx, y + pady - 1), s, font=f, fill=fg)
    return w, h


def card(d, box, title=None, sub=None):
    rrect(d, box, r=12)
    x0, y0, x1, y1 = box
    yy = y0 + 16
    if title:
        d.text((x0 + 20, yy), title, font=f_h2, fill=TEXT)
        yy += 26
        if sub:
            d.text((x0 + 20, yy), sub, font=f_small, fill=MUTED)
            yy += 18
        yy += 2
    return x0 + 20, yy, x1 - 20, y1 - 16


def header(d, active, note=None):
    d.rectangle((0, 0, W, 62), fill=CARD)
    d.line((0, 62, W, 62), fill=BORDER)
    rrect(d, (24, 15, 56, 47), r=9, fill=ACCENT, outline=ACCENT)
    d.text((35, 21), 'F', font=F(19, True), fill=(255, 255, 255))
    d.text((68, 22), 'Face', font=f_h2, fill=TEXT)
    d.text((122, 25), 'AI 模拟面试练习', font=f_small, fill=MUTED)
    nav = ['首页', '历史', '设置']
    x = 980
    for i, n in enumerate(nav):
        on = i == active
        if on:
            rrect(d, (x - 14, 16, x + 58, 46), r=8, fill=ACCENT_BG, outline=ACCENT_BG)
        d.text((x, 25), n, font=f_bold if on else f_body, fill=ACCENT if on else SUB)
        x += 96
    if note:
        w, _ = tw(d, note, f_small) + 20, 0
        pill(d, (W - w - 24, 19), note, bg=WARN_BG, fg=WARN_TX, bd=WARN_BD)


def page(num, title):
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((24, H - 24), f'{num} / 8  ·  {title}', font=f_tiny, fill=MUTED)
    d.text((W - 300, H - 24), '1.0 低保真原型 · 非最终视觉', font=f_tiny, fill=MUTED)
    return img, d


def save(img, name):
    img.save(os.path.join(OUT, name))
    print('saved', name)


def dashed(d, box, r=12, color=DASH_BD, width=2, seg=9, gap=7):
    x0, y0, x1, y1 = box
    for x in range(x0 + r, x1 - r, seg + gap):
        d.line((x, y0, min(x + seg, x1 - r), y0), fill=color, width=width)
        d.line((x, y1, min(x + seg, x1 - r), y1), fill=color, width=width)
    for y in range(y0 + r, y1 - r, seg + gap):
        d.line((x0, y, x0, min(y + seg, y1 - r)), fill=color, width=width)
        d.line((x1, y, x1, min(y + seg, y1 - r)), fill=color, width=width)


def btn(d, box, label, primary=True, f=f_bold):
    if primary:
        rrect(d, box, r=8, fill=ACCENT, outline=ACCENT)
        fg = (255, 255, 255)
    else:
        rrect(d, box, r=8, fill=CARD, outline=BORDER)
        fg = TEXT
    cx = box[0] + (box[2] - box[0] - tw(d, label, f)) / 2
    cy = box[1] + (box[3] - box[1] - f.size) / 2 - 1
    d.text((cx, cy), label, font=f, fill=fg)


def arrow(d, x0, y0, x1, y1, color=MUTED, width=2, head=7):
    d.line((x0, y0, x1, y1), fill=color, width=width)
    ang = math.atan2(y1 - y0, x1 - x0)
    for s in (-1, 1):
        a = ang + s * 0.45
        d.line((x1, y1, x1 - head * math.cos(a), y1 - head * math.sin(a)),
               fill=color, width=width)


def bar(d, box, frac, color=ACCENT, bg=FILL):
    x0, y0, x1, y1 = box
    d.rounded_rectangle((x0, y0, x1, y1), radius=(y1 - y0) // 2, fill=bg)
    if frac > 0:
        w = int((x1 - x0) * min(frac, 1.0))
        if w > (y1 - y0):
            d.rounded_rectangle((x0, y0, x0 + w, y1), radius=(y1 - y0) // 2, fill=color)


# ============================================================ 01 首页
img, d = page('01', '首页 Home')
header(d, 0, '题库：seed 200 题')

rrect(d, (200, 100, 1240, 380))
d.text((240, 140), '开始一场模拟面试', font=f_title, fill=TEXT)
text(d, (240, 190), '10 道题：5 道八股 + 5 道简历拷打。每题最多两层追问，追问不计入题量。',
     f_body, SUB, maxw=900)
d.text((240, 218), 'BODY 维度在 1.0 未启用，报告会明确标注「未启用」而不是 0 分。',
       font=f_small, fill=MUTED)

btn(d, (240, 262, 440, 310), '开始新面试')
rrect(d, (456, 262, 800, 310), r=8, fill=CARD, outline=BORDER)
d.text((478, 274), '继续未完成（第 6 / 10 题）', font=f_bold, fill=TEXT)
pill(d, (700, 276), '断点续答', bg=FILL, fg=SUB)

cards = [('题库', '10 个知识点池 · 200 题', 'seed 阶段，质量未校验 · 报告会标注'),
         ('最近一次', '78.4 分 · 前端 · 10 题', '覆盖率 89%，样本不足时只给区间'),
         ('数据位置', '存在你的账号下', '换设备登录可见 · 可导出可删除')]
cw, gap = 320, 20
cx = 200
for t, v, s in cards:
    rrect(d, (cx, 410, cx + cw, 560))
    d.text((cx + 20, 432), t, font=f_small, fill=MUTED)
    text(d, (cx + 20, 456), v, f_bold, TEXT, maxw=cw - 40)
    text(d, (cx + 20, 512), s, f_small, MUTED, maxw=cw - 40)
    cx += cw + gap

rrect(d, (200, 590, 1240, 700), fill=(250, 251, 252))
text(d, (220, 612), '评分用于练习反馈，不是招聘结论，也不作为简历真实性判定。种子题库仅用于打通链路，'
     '报告中的「占位题库」提示不会隐藏。', f_body, SUB, maxw=980)

rrect(d, (200, 730, 1240, 806), fill=CARD)
d.text((220, 748), '第一次使用？', font=f_bold, fill=TEXT)
d.text((330, 748), '先选岗位与权重 → 上传简历 → 开始。权重不写死，随时可改。',
       font=f_small, fill=SUB)
pill(d, (1080, 744), '约 1 分钟', bg=FILL, fg=SUB)

save(img, '01-首页.png')

# ============================================================ 02 设置
img, d = page('02', '设置：岗位与权重')
header(d, 2)
steps = ['① 岗位与权重', '② 简历', '③ 面试', '④ 报告']
x = 40
for i, s in enumerate(steps):
    on = i == 0
    w, _ = pill(d, (x, 80), s, bg=ACCENT_BG if on else FILL, fg=ACCENT if on else MUTED)
    x += w + 36

L = (40, 124, 470, 836)
x0, y0, x1, y1 = L
card(d, L, '岗位与模式')
d.text((60, 196), '岗位族', font=f_small, fill=MUTED)
x = 60
for i, c in enumerate(['自定义', '前端', '后端', '测试']):
    on = i == 0
    rrect(d, (x, 214, x + 84, 248), r=7, fill=ACCENT_BG if on else CARD,
          outline=ACCENT if on else BORDER)
    d.text((x + (84 - tw(d, c, f_small)) / 2, 222), c, font=f_small,
           fill=ACCENT if on else SUB)
    x += 94

d.text((60, 272), '级别', font=f_small, fill=MUTED)
x = 60
for i, c in enumerate(['初级', '中级', '高级']):
    on = i == 1
    rrect(d, (x, 290, x + 76, 324), r=7, fill=ACCENT_BG if on else CARD,
          outline=ACCENT if on else BORDER)
    d.text((x + (76 - tw(d, c, f_small)) / 2, 298), c, font=f_small,
           fill=ACCENT if on else SUB)
    x += 86

d.text((60, 352), '题量（固定）', font=f_small, fill=MUTED)
rrect(d, (60, 370, 450, 410), r=8, fill=FILL, outline=FILL)
d.text((74, 379), '八股 5 道 ＋ 简历 5 道 ＝ 10 题', font=f_small, fill=SUB)

d.text((60, 430), '顺序策略', font=f_small, fill=MUTED)
for i, (c, note, on) in enumerate([('交替', '八股 / 拷打穿插（默认）', True),
                                  ('分块', '5 八股 → 5 拷打', False)]):
    y = 450 + i * 46
    rrect(d, (60, y, 450, y + 38), r=8, fill=CARD, outline=ACCENT if on else BORDER)
    d.ellipse((72, y + 12, 88, y + 28), outline=ACCENT if on else MUTED, width=2)
    if on:
        d.ellipse((77, y + 17, 83, y + 23), fill=ACCENT)
    d.text((98, y + 10), c, font=f_bold, fill=TEXT)
    d.text((150, y + 11), note, font=f_small, fill=MUTED)

rrect(d, (60, 570, 450, 720), fill=(250, 251, 252))
d.text((76, 588), '权重全为 0 时禁止开始', font=f_small, fill=SUB)
d.text((76, 614), '题库不足时减题，最低 6 题', font=f_small, fill=SUB)
d.text((76, 640), '简历为空时改用通用深挖题', font=f_small, fill=SUB)
d.text((76, 666), '权重只影响配额，不影响评分权重', font=f_small, fill=WARN_TX)

rrect(d, (60, 750, 450, 800), r=8, fill=ACCENT_BG, outline=ACCENT_BG)
d.text((74, 762), '当前配额：5 道（覆盖 5 个方向）', font=f_small, fill=ACCENT)

# 中：权重
M = (490, 124, 1120, 836)
card(d, M, '知识点权重', '相对重要性，不是题量；总和不必为 100，内部归一化')
pools = [('js', 'JavaScript', 30), ('vue', 'Vue', 20), ('react', 'React', 20),
         ('network', '计算机网络', 20), ('engineering', '前端工程化', 20),
         ('html', 'HTML / CSS', 10), ('algorithm', '数据结构与算法', 10),
         ('database', '数据库', 10), ('os', '操作系统', 0), ('java', 'Java', 10)]
y = 200
for tid, name, val in pools:
    d.text((510, y), name, font=f_body, fill=TEXT if val else MUTED)
    d.text((510, y + 19), tid, font=f_tiny, fill=MUTED)
    tx0, tx1 = 700, 1040
    d.rounded_rectangle((tx0, y + 10, tx1, y + 16), radius=3, fill=FILL)
    if val:
        hx = tx0 + (tx1 - tx0) * (val / 30.0)
        d.rounded_rectangle((tx0, y + 10, hx, y + 16), radius=3, fill=ACCENT)
    else:
        hx = tx0
    d.ellipse((hx - 8, y + 5, hx + 8, y + 21), fill=CARD,
              outline=ACCENT if val else MUTED, width=2)
    d.text((1062, y + 1), str(val), font=f_bold, fill=TEXT if val else MUTED)
    y += 48

d.line((510, 690, 1100, 690), fill=BORDER)
d.text((510, 706), '说明：5 道题时权重主要决定谁进前 5；同分按 topicId 字典序稳定排序。',
       font=f_small, fill=MUTED)

# 右：预览
R = (1140, 124, 1400, 836)
card(d, R, '预计出题', '根据当前权重实时计算')
prev = [('JavaScript', 1), ('Vue', 1), ('网络', 1), ('React', 1), ('工程化', 1)]
y = 214
for n, c in prev:
    rrect(d, (1160, y, 1380, y + 38), r=8, fill=FILL, outline=FILL)
    d.text((1174, y + 10), n, font=f_small, fill=SUB)
    d.text((1352, y + 9), f'{c} 道', font=f_bold, fill=TEXT)
    y += 46
d.text((1160, y + 8), '覆盖 5 个方向，满足 ≥3 主题', font=f_tiny, fill=OK)
d.text((1160, y + 30), 'Java 0 道 · 权重 10，未进前 5', font=f_tiny, fill=WARN_TX)
d.text((1160, y + 52), '题库不足会自动降级并提示', font=f_tiny, fill=MUTED)

btn(d, (1160, 762, 1380, 806), '下一步：上传简历')

save(img, '02-设置.png')

# ============================================================ 03 简历
img, d = page('03', '简历：上传与确认')
header(d, 2)
steps = ['① 岗位与权重', '② 简历', '③ 面试', '④ 报告']
x = 40
for i, s in enumerate(steps):
    on = i == 1
    done = i == 0
    w, _ = pill(d, (x, 80), s, bg=ACCENT_BG if on else (OK_BG if done else FILL),
                fg=ACCENT if on else (OK if done else MUTED))
    x += w + 36

# 左：上传
lcard = (40, 124, 620, 500)
x0, y0, x1, y1 = lcard
card(d, lcard, '① 上传简历')
tabs = ['PDF', '图片', '粘贴文本']
x = 60
for i, t in enumerate(tabs):
    on = i == 1
    rrect(d, (x, 190, x + 92, 224), r=7, fill=ACCENT_BG if on else CARD,
          outline=ACCENT if on else BORDER)
    d.text((x + (92 - tw(d, t, f_small)) / 2, 198), t, font=f_small,
           fill=ACCENT if on else SUB)
    x += 100

dashed(d, (60, 240, 600, 400))
d.text((250, 296), '拖入图片，或点击选择', font=f_body, fill=SUB)
d.text((232, 322), '支持 jpg / png / webp，单张 ≤10MB', font=f_small, fill=MUTED)
pill(d, (270, 352), '扫描件会走 OCR', bg=FILL, fg=SUB)

rrect(d, (60, 416, 600, 470), r=8, fill=WARN_BG, outline=WARN_BD)
d.text((74, 426), '检测到 1 处手机号，建议打码后再解析', font=f_small, fill=WARN_TX)
d.text((74, 446), '[ 一键打码 ]    [ 仍然继续 ]', font=f_small, fill=WARN_TX)

# 左下：解析状态
l2 = (40, 516, 620, 820)
x0, y0, x1, y1 = l2
card(d, l2, '② 解析状态', '失败不会复用成功结构')
rows = [('OCR 文本提取', '完成 · 3 812 字', OK), ('结构化解析', '完成 · 置信度 0.86', OK),
        ('疑点识别', '3 条 · 高 2 / 中 1', ACCENT)]
y = 604
for n, v, c in rows:
    d.text((60, y), n, font=f_small, fill=SUB)
    d.text((330, y), v, font=f_small, fill=c)
    y += 30
d.line((60, 700, 600, 700), fill=BORDER)
d.text((60, 714), '失败示例', font=f_tiny, fill=MUTED)
rrect(d, (60, 732, 600, 800), r=8, fill=(252, 252, 253), outline=BORDER)
d.text((74, 742), 'E_OCR_LOW_QUALITY', font=f_tiny, fill=WARN_TX)
d.text((74, 760), '图片可能不清晰 → 直接进入手填，不再弹二次确认', font=f_small, fill=SUB)

# 右：结果
rcard = (640, 124, 1400, 820)
x0, y0, x1, y1 = rcard
card(d, rcard, '③ 解析结果（可编辑）', '字段可改，改完才算定稿；疑点保留但标记 edited')

fields = [('姓名 / 岗位', '张 · 前端工程师'), ('工作年限', '3 年'),
          ('教育', '2016.09 – 2020.06 · 本科 · 计算机'),
          ('经历 1', '2021.03 – 2023.06 · 某电商 · 前端 · 6 人'),
          ('项目', '商品中台 · 主导 · React / Vite')]
y = 214
for n, v in fields:
    d.text((660, y + 8), n, font=f_small, fill=MUTED)
    rrect(d, (790, y, 1080, y + 34), r=7, fill=FILL, outline=BORDER)
    d.text((802, y + 7), v, font=f_small, fill=TEXT)
    d.text((1092, y + 8), '编辑', font=f_tiny, fill=ACCENT)
    y += 46

d.text((660, 470), '简历疑点（将用于追问）', font=f_h3, fill=TEXT)
susp = [('METRIC', '「性能提升 300%」无统计口径', '高'),
        ('TIME_GAP', '2022.01 – 2022.08 无说明', '高'),
        ('OWNERSHIP', '「主导」与 6 人团队需澄清', '中')]
y = 500
for t, s, risk in susp:
    rrect(d, (660, y, 1380, y + 56), r=8, fill=CARD, outline=BORDER)
    pill(d, (672, y + 14), t, bg=FILL, fg=SUB)
    d.text((672, y + 36), s, font=f_small, fill=TEXT)
    d.text((1330, y + 18), risk, font=f_small, fill=WARN_TX)
    y += 64

d.line((660, 700, 1380, 700), fill=BORDER)
d.text((660, 714), '提示：疑点不等于造假，追问只用于澄清事实。', font=f_small, fill=MUTED)

btn(d, (1180, 754, 1380, 798), '确认并组卷')
btn(d, (1020, 754, 1164, 798), '重新解析', primary=False)

save(img, '03-简历.png')

# ============================================================ 04 面试
img, d = page('04', '面试：答题页')
header(d, -1, '● 录音中')

rrect(d, (40, 82, 1400, 122), r=8, fill=CARD)
d.text((60, 94), '第 3 / 10 题', font=f_bold, fill=TEXT)
pill(d, (180, 90), '八股 · Vue · 中等', bg=ACCENT_BG, fg=ACCENT)
d.text((360, 94), '00:42', font=f_bold, fill=TEXT)
d.text((430, 95), '本题限时 03:00', font=f_small, fill=MUTED)
bar(d, (600, 100, 1200, 106), 0.3, ACCENT)
d.text((1216, 95), '结束本场', font=f_small, fill=MUTED)

# 题干
rrect(d, (40, 142, 1000, 300))
d.text((64, 162), '题目', font=f_tiny, fill=MUTED)
text(d, (64, 184), 'Vue 3 为什么改用 Proxy 实现响应式？它解决了 Vue 2 的哪些问题？', f_title, TEXT, maxw=880)
d.text((64, 272), '本题为口头作答，评分依据：命中核心差异 + 具体案例 + 权衡取舍。',
       font=f_small, fill=MUTED)

# 录音
rrect(d, (40, 320, 1000, 560), fill=CARD)
d.text((64, 340), '录音', font=f_tiny, fill=MUTED)
d.ellipse((64, 364, 80, 380), fill=(220, 70, 70))
d.text((90, 364), '录音中 · 00:42', font=f_bold, fill=TEXT)
d.text((280, 365), '采样 16 kHz · 已切 3 段', font=f_small, fill=MUTED)

for i in range(64):
    h = 8 + int(26 * abs(math.sin(i * 0.55) * math.cos(i * 0.17)))
    x = 64 + i * 14
    d.rounded_rectangle((x, 430 - h // 2, x + 8, 430 + h // 2), radius=3,
                        fill=ACCENT if i < 30 else BAR)

btn(d, (64, 496, 200, 536), '结束作答')
btn(d, (216, 496, 316, 536), '跳过', primary=False)
d.text((336, 506), '空格 结束 · Esc 跳过', font=f_small, fill=MUTED)

# 转写
rrect(d, (40, 580, 1000, 830), fill=CARD)
d.text((64, 600), '转写结果（可编辑后提交）', font=f_tiny, fill=MUTED)
pill(d, (300, 594), 'ASR 置信度 0.93', bg=OK_BG, fg=OK)
d.text((512, 600), '按静默切段，时间戳误差 ±1.5s', font=f_tiny, fill=MUTED)
rrect(d, (64, 628, 976, 736), r=8, fill=(252, 252, 253), outline=BORDER)
text(d, (78, 644), 'Proxy 拦截的是整个对象的读写，所以新增、删除属性都能被捕获，不用再写 $set。'
     'Vue 2 用 defineProperty 只能劫持已有属性，数组下标也监听不到……', f_body, SUB, maxw=880)
d.text((78, 706), '（此处可直接修改错别字，修改后重新评分）', font=f_small, fill=MUTED)

d.text((64, 756), '你的口头禅统计（实时）', font=f_small, fill=MUTED)
d.text((64, 780), '额 ×3    那个 ×2    就是 ×1     密度 7.2 次/分', font=f_small, fill=WARN_TX)
d.text((64, 802), '提示：密度阈值 6 次/分，超出会扣分，报告可展开到具体时间点。',
       font=f_tiny, fill=MUTED)

# 右栏
R = (1020, 142, 1400, 830)
x0, y0, x1, y1 = R
card(d, R, '本题信息')
d.text((1040, 202), '方向', font=f_small, fill=MUTED)
d.text((1120, 202), 'Vue · 响应式原理', font=f_small, fill=TEXT)
d.text((1040, 228), '难度', font=f_small, fill=MUTED)
d.text((1120, 228), '中等（2/3）', font=f_small, fill=TEXT)
d.text((1040, 254), '追问', font=f_small, fill=MUTED)
d.text((1120, 254), '第 0 层 / 最多 2 层', font=f_small, fill=TEXT)

d.line((1040, 284, 1380, 284), fill=BORDER)
d.text((1040, 298), '预期要点（不展示给用户，用于评分）', font=f_tiny, fill=MUTED)
for i, s in enumerate(['Proxy 拦截整个对象', '惰性代理 / 深层递归时机', '不兼容 IE 的代价']):
    d.text((1040, 322 + i * 30), '· ' + s, font=f_small, fill=SUB)

d.line((1040, 430, 1380, 430), fill=BORDER)
d.text((1040, 444), '追问规则', font=f_tiny, fill=MUTED)
d.text((1040, 466), 'L1 澄清事实 → L2 追问细节 → L3 压力测试',
       font=f_small, fill=SUB)
d.text((1040, 486), '追问不计入 10 题，单独记录。', font=f_small, fill=SUB)

rrect(d, (1040, 520, 1380, 600), r=8, fill=WARN_BG, outline=WARN_BD)
d.text((1054, 530), '降级提示（示例）', font=f_tiny, fill=WARN_TX)
d.text((1054, 550), '语音识别不可用 → 可直接打字作答', font=f_small, fill=WARN_TX)
d.text((1054, 570), '不会中断本场面试', font=f_small, fill=WARN_TX)

d.line((1040, 620, 1380, 620), fill=BORDER)
d.text((1040, 634), '本场', font=f_tiny, fill=MUTED)
d.text((1040, 656), '已完成 2 题 · 剩余 8 题', font=f_small, fill=TEXT)
d.text((1040, 678), '状态每分钟自动保存', font=f_tiny, fill=MUTED)

btn(d, (1040, 754, 1380, 798), '结束并出报告', primary=False)

save(img, '04-面试.png')

# ============================================================ 05 报告
img, d = page('05', '报告：总分与明细')
header(d, -1)

rrect(d, (40, 82, 1400, 230))
d.text((64, 104), '78.4', font=f_big, fill=TEXT)
d.text((190, 128), '总分 / 100', font=f_small, fill=MUTED)
pill(d, (190, 152), '良好 · 高于 60% 的练习者', bg=OK_BG, fg=OK)
d.text((64, 176), '覆盖率 89% · 样本充足，输出点值', font=f_small, fill=MUTED)
d.text((64, 198), '口径 scoringVersion 1.0.0 · 题库 1.0.0-seed · 提示词 1.0.0', font=f_tiny, fill=MUTED)

btn(d, (1150, 104, 1272, 142), 'JSON', primary=False)
btn(d, (1284, 104, 1376, 142), '打印', primary=False)
pill(d, (1150, 152), '占位题库 · 质量未校验', bg=WARN_BG, fg=WARN_TX, bd=WARN_BD)

# 左：维度
LC = (40, 250, 700, 590)
x0, y0, x1, y1 = LC
card(d, LC, '六维得分', 'BODY 在 1.0 未启用，不参与加权')
dims = [('内容质量', 'CONTENT', 82, 40, ACCENT, '已评分'),
        ('表达流畅', 'FLUENCY', 74, 15, ACCENT, '已评分'),
        ('口头禅', 'FILLER', 90, 10, ACCENT, '已评分'),
        ('动作表现', 'BODY', None, 0, MUTED, '未启用'),
        ('简历追问', 'RESUME', 68, 15, ACCENT, '已评分'),
        ('岗位匹配', 'FIT', 80, 10, ACCENT, '已评分')]
y = 320
for name, code, sc, w, c, st in dims:
    d.text((60, y), name, font=f_small, fill=TEXT)
    d.text((60, y + 18), f'{code} · 权重 {w}', font=f_tiny, fill=MUTED)
    if sc is None:
        rrect(d, (300, y + 8, 570, y + 18), r=5, fill=(238, 240, 244), outline=(238, 240, 244))
        d.text((584, y), '未启用', font=f_small, fill=MUTED)
    else:
        bar(d, (300, y + 8, 570, y + 18), sc / 100.0, c)
        d.text((584, y), f'{sc}', font=f_bold, fill=TEXT)
        d.text((620, y + 2), st, font=f_tiny, fill=MUTED)
    y += 44

d.line((60, 562, 680, 562), fill=BORDER)
d.text((60, 570), '不计入分母的维度会自动剔除并重新归一化，不会记 0 分。', font=f_tiny, fill=MUTED)

# 右：扣分
RC = (720, 250, 1400, 590)
x0, y0, x1, y1 = RC
card(d, RC, '扣分明细', '每条都能定位到规则、时间点与原文')
items = [('FIL-001', '口头禅密度超标', 3, '00:12.8', '7.2 次/分 > 阈值 6.0',
          '「额……那个，我当时主要是负责这个模块」'),
         ('CNT-002', '仅复述概念，无具体案例', 8, '—', '缺少实现细节与取舍',
          '「Proxy 就是比 defineProperty 更好用」'),
         ('RES-001', '简历疑点未澄清', 6, '第 8 题', '追问 2 次仍无量化口径',
          '「性能提升 300%」未说明基线')]
y = 320
for rid, name, pts, t, cond, ev in items:
    rrect(d, (740, y, 1380, y + 82), r=8, fill=(252, 252, 253), outline=BORDER)
    pill(d, (752, y + 10), rid, bg=WARN_BG, fg=WARN_TX)
    d.text((836, y + 12), name, font=f_bold, fill=TEXT)
    d.text((1330, y + 10), f'扣 {pts}', font=f_bold, fill=(190, 60, 60))
    d.text((752, y + 38), f'{t}  ·  {cond}', font=f_tiny, fill=MUTED)
    d.text((752, y + 56), ev, font=f_small, fill=SUB)
    d.text((1284, y + 52), '申请复核', font=f_tiny, fill=ACCENT)
    y += 90

# 下：逐题 + warnings
rrect(d, (40, 610, 1400, 690), fill=WARN_BG, outline=WARN_BD)
d.text((60, 622), '本场说明（不可隐藏）', font=f_tiny, fill=WARN_TX)
d.text((60, 642), '· 使用占位题库（seed 200 题），题目质量未人工校验    '
     '· BODY 动作维度未启用    · 本次为「交替」顺序', font=f_small, fill=WARN_TX)

rrect(d, (40, 710, 1400, 830))
d.text((60, 724), '逐题回顾', font=f_h3, fill=TEXT)
d.text((160, 727), '点击任意题查看转写、追问与建议', font=f_tiny, fill=MUTED)
x = 60
scores = [('1', 82), ('2', 76), ('3', 71), ('4', 88), ('5', 64),
          ('6', 79), ('7', 83), ('8', 58), ('9', 77), ('10', 81)]
for i, (n, s) in enumerate(scores):
    rrect(d, (x, 750, x + 118, 816), r=8, fill=(252, 252, 253), outline=BORDER)
    d.text((x + 10, 758), f'第 {n} 题', font=f_tiny, fill=MUTED)
    d.text((x + 10, 778), str(s), font=f_num, fill=TEXT)
    if s < 65:
        d.text((x + 60, 786), '偏弱', font=f_tiny, fill=WARN_TX)
    x += 126

save(img, '05-报告.png')

# ============================================================ 06 历史
img, d = page('06', '历史记录')
header(d, 1)

rrect(d, (40, 82, 1400, 150), r=8, fill=CARD)
d.text((60, 100), '共 7 场', font=f_bold, fill=TEXT)
for i, (t, on) in enumerate([('全部', True), ('已完成', False), ('未完成', False)]):
    x = 160 + i * 100
    rrect(d, (x, 96, x + 82, 128), r=7, fill=ACCENT_BG if on else CARD,
          outline=ACCENT if on else BORDER)
    d.text((x + (82 - tw(d, t, f_small)) / 2, 104), t, font=f_small,
           fill=ACCENT if on else SUB)
d.text((1120, 102), '按时间倒序', font=f_small, fill=MUTED)

cols = [(60, '时间'), (240, '岗位'), (420, '题量'), (540, '总分'), (700, '状态'), (1150, '操作')]
rrect(d, (40, 170, 1400, 210), r=8, fill=FILL, outline=FILL)
for x, c in cols:
    d.text((x, 182), c, font=f_small, fill=MUTED)

rows = [('11-03 09:41', '前端 · 自定义', '10', '78.4', '已完成', None),
        ('11-02 22:10', '前端 · 自定义', '10', '—', '未完成 6/10', '继续'),
        ('11-02 20:03', '后端 · Java', '10', '71.2', '已完成', None),
        ('11-01 19:22', '前端 · 自定义', '10', '65.8', '已完成', None),
        ('10-31 21:05', '前端 · 自定义', '8', '—', '已放弃', None)]
y = 214
for t, role, n, sc, st, act in rows:
    d.line((40, y + 62, 1400, y + 62), fill=BORDER)
    d.text((60, y + 20), t, font=f_small, fill=TEXT)
    d.text((240, y + 20), role, font=f_small, fill=SUB)
    d.text((420, y + 20), n, font=f_small, fill=SUB)
    d.text((540, y + 18), sc, font=f_bold if sc != '—' else f_small,
           fill=TEXT if sc != '—' else MUTED)
    if '未完成' in st:
        pill(d, (700, y + 14), st, bg=WARN_BG, fg=WARN_TX, bd=WARN_BD)
    elif '放弃' in st:
        pill(d, (700, y + 14), st, bg=FILL, fg=MUTED)
    else:
        pill(d, (700, y + 14), st, bg=OK_BG, fg=OK)
    if act:
        btn(d, (1290, y + 12, 1380, y + 46), act)
    else:
        d.text((1300, y + 20), '查看', font=f_small, fill=ACCENT)
    if '未完成' in st:
        d.text((60, y + 42), '离开时停在第 6 题，可继续（该题需重录）', font=f_tiny, fill=MUTED)
    y += 64

rrect(d, (40, 640, 1400, 740), r=8, fill=(250, 251, 252), outline=BORDER)
d.text((60, 656), '恢复规则', font=f_small, fill=TEXT)
d.text((60, 680), '刷新或崩溃后回到「当前题」重录，已完成题目不丢；音频默认保留 7 天，'
     '超期自动清理但保留报告。', font=f_small, fill=SUB)
d.text((60, 706), '删除记录 = 同时删 session / audio / report 三处，且在 IndexedDB 中真实清除。',
       font=f_small, fill=SUB)

btn(d, (1160, 760, 1380, 800), '清除全部音频', primary=False)

save(img, '06-历史.png')

# ============================================================ 07 设置与凭证
img, d = page('07', '设置：服务端、账号与数据')
header(d, 2)

c1 = (40, 100, 700, 300)
x0, y0, x1, y1 = c1
card(d, c1, '服务端连接', '密钥只在后端，前端不持 Key')
d.ellipse((60, 186, 74, 200), fill=OK)
d.text((84, 184), 'API 已连接', font=f_bold, fill=TEXT)
d.text((60, 210), '127.0.0.1:3000 · /api/health 正常 · 数据库在线',
       font=f_small, fill=SUB)
pill(d, (60, 236), 'NestJS + PostgreSQL', bg=FILL, fg=SUB)
pill(d, (240, 236), '本机运行', bg=OK_BG, fg=OK)
d.text((60, 268), '后端不可用时页面进入只读态并提示启动命令，不静默失败。',
       font=f_tiny, fill=MUTED)

c2 = (720, 100, 1400, 300)
x0, y0, x1, y1 = c2
card(d, c2, '账号', '1.0 单用户')
rrect(d, (740, 186, 1120, 222), r=7, fill=FILL, outline=BORDER)
d.text((754, 194), 'owner@local · 已登录', font=f_small, fill=TEXT)
btn(d, (1130, 186, 1190, 222), '退出', primary=False)
d.text((740, 232), '所有资源按 ownerId 隔离；越权访问返回 403 并记审计。',
       font=f_small, fill=SUB)
d.text((740, 256), '1.0 不做注册开放、多用户与找回密码。', font=f_small, fill=WARN_TX)

c3 = (40, 320, 700, 560)
x0, y0, x1, y1 = c3
card(d, c3, '数据管理', '全部在服务端，可随时清除')
btn(d, (60, 396, 220, 434), '导出诊断日志', primary=False)
btn(d, (232, 396, 372, 434), '清除音频', primary=False)
btn(d, (384, 396, 524, 434), '删除全部', primary=False)
d.text((60, 450), '诊断日志只含时间、模块、错误码与耗时，不含简历正文与音频。',
       font=f_small, fill=SUB)
d.text((60, 474), '删除会同时清理 7 张表中的数据与磁盘音频文件，软删后定时物理清除。',
       font=f_small, fill=SUB)
d.text((60, 510), '当前占用：音频 12.4 MB · 报告 0.3 MB', font=f_tiny, fill=MUTED)

c4 = (720, 320, 1400, 560)
x0, y0, x1, y1 = c4
card(d, c4, '隐私说明', '两句必须同时出现，不能合并')
rrect(d, (740, 396, 1380, 440), r=8, fill=OK_BG, outline=OK_BG)
d.text((754, 406), '① 简历、录音与报告存在你的账号下，仅你可访问，可导出可删除。',
       font=f_small, fill=OK)
rrect(d, (740, 448, 1380, 492), r=8, fill=WARN_BG, outline=WARN_BD)
d.text((754, 458), '② 简历文本与录音会发送至百度 / DeepSeek 做识别与评分。',
       font=f_small, fill=WARN_TX)
d.text((740, 506), '上传前会再确认一次；可先对手机号、身份证号做打码。',
       font=f_small, fill=SUB)

c5 = (40, 580, 1400, 700)
x0, y0, x1, y1 = c5
card(d, c5, '口径版本', '报告会记录这三项，跨版本对比时提示差异')
vals = [('scoringVersion', '1.0.0'), ('promptVersion', '1.0.0'), ('bankVersion', '1.0.0-seed')]
x = 60
for k, v in vals:
    d.text((x, 646), k, font=f_tiny, fill=MUTED)
    d.text((x, 664), v, font=f_bold, fill=TEXT)
    x += 240

d.text((60, 730), '连不上时怎么办？', font=f_bold, fill=TEXT)
d.text((60, 756), '1) 确认后端在跑（npm run dev）；2) 确认 db 容器已起；3) 检查 .env 的 DATABASE_URL 与 '
     'DEEPSEEK_API_KEY / BAIDU_AK / BAIDU_SK。', font=f_small, fill=SUB)
d.text((60, 782), '前端产物不含任何密钥；公网使用必须重新评审（3.0）。', font=f_small, fill=MUTED)

save(img, '07-设置.png')

# ============================================================ 08 降级
img, d = page('08', '降级态：四条链路')
header(d, -1, '降级演示')

d.text((40, 84), '任何一条降级发生后，本场仍必须能产出报告。做不到就不叫降级。',
       font=f_h2, fill=TEXT)

cases = [
    ('D1', 'ASR 识别失败', '语音识别不可用（重试 3 次 / 配额耗尽）',
     '切「文字作答」，输入框自动聚焦，已转写内容保留', OK),
    ('D2', 'OCR 失败', '图片质量低 / 接口报错',
     '跳出手填面板，直接编辑简历文本，不弹二次确认', OK),
    ('D3', 'AI 评分失败', '超时 / 非法 JSON / 额度用尽',
     '用规则分兜底 + 模板追问，题目继续，报告标注「AI 不可用」', WARN_TX),
    ('D4', '动作未启用', '1.0 无姿态模型',
     '报告显示「未启用」而非 0 分，权重剔除并归一化', MUTED),
]
pos = [(40, 140), (720, 140), (40, 430), (720, 430)]
for (code, title, why, how, c), (px, py) in zip(cases, pos):
    rrect(d, (px, py, px + 660, py + 260))
    rrect(d, (px + 20, py + 20, px + 76, py + 72), r=10, fill=ACCENT_BG, outline=ACCENT_BG)
    d.text((px + 34, py + 32), code, font=F(20, True), fill=ACCENT)
    d.text((px + 92, py + 26), title, font=f_h3, fill=TEXT)
    d.text((px + 92, py + 50), why, font=f_small, fill=MUTED)

    rrect(d, (px + 20, py + 92, px + 640, py + 148), r=8, fill=WARN_BG, outline=WARN_BD)
    d.text((px + 34, py + 102), '系统提示条（页内内联，不用 alert）', font=f_tiny, fill=WARN_TX)
    d.text((px + 34, py + 122), how, font=f_small, fill=WARN_TX)

    if code == 'D1':
        rrect(d, (px + 20, py + 162, px + 470, py + 200), r=7, fill=CARD, outline=BORDER)
        d.text((px + 34, py + 170), '请手动输入刚才的回答……', font=f_small, fill=MUTED)
        btn(d, (px + 486, py + 162, px + 640, py + 200), '提交', primary=False)
    elif code == 'D2':
        rrect(d, (px + 20, py + 162, px + 640, py + 200), r=7, fill=CARD, outline=BORDER)
        d.text((px + 34, py + 170), 'E_OCR_LOW_QUALITY · 图片可能不清晰', font=f_small, fill=WARN_TX)
    elif code == 'D3':
        rrect(d, (px + 20, py + 162, px + 640, py + 200), r=7, fill=(252, 252, 253), outline=BORDER)
        d.text((px + 34, py + 170), '本题分数：规则分 74 · 内容维度待复核（不给点值）',
               font=f_small, fill=SUB)
    else:
        rrect(d, (px + 20, py + 162, px + 640, py + 200), r=7, fill=(240, 242, 246), outline=(240, 242, 246))
        d.text((px + 34, py + 170), '动作表现  未启用   权重 0   已从分母剔除',
               font=f_small, fill=MUTED)

    d.text((px + 24, py + 224), f'验收：{code} 发生后仍能出报告，且报告有对应标注', font=f_tiny, fill=MUTED)

save(img, '08-降级态.png')

# 统一规则补充块
img2 = img
d2 = ImageDraw.Draw(img2)
rrect(d2, (40, 716, 1400, 836), r=12, fill=CARD)
d2.text((60, 730), '统一规则（四条共用）', font=f_h3, fill=TEXT)
d2.text((60, 760), '① 提示必须页内内联，禁用 alert / confirm；② 每个错误码都要映射到「重试 / 降级 / 跳过」三选一；',
        font=f_small, fill=SUB)
d2.text((60, 784), '③ 降级后仍要落库并出报告，报告顶部保留降级说明；④ 不允许静默丢弃用户已作答内容。',
        font=f_small, fill=SUB)
d2.text((60, 812), '对应文档：PM-00 §9 风险红线 R3/R4、PLAN §4.12（M12 降级与错误处理）。',
        font=f_tiny, fill=MUTED)
img2.save(os.path.join(OUT, '08-降级态.png'))
print('saved 08-降级态.png (patched)')

# ============================================================ 00 流程
img = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(img)
d.text((40, 40), '1.0 主流程与状态机', font=f_title, fill=TEXT)
d.text((40, 82), '页面流 → 会话状态机 → 四条降级分支。任何一步失败都必须有出口，不允许白屏。',
       font=f_body, fill=SUB)
d.text((24, H - 24), '00 / 8  ·  流程总览', font=f_tiny, fill=MUTED)
d.text((W - 300, H - 24), '1.0 低保真原型 · 非最终视觉', font=f_tiny, fill=MUTED)


def node(box, title, sub=None, fill=CARD, bd=BORDER, tc=TEXT):
    rrect(d, box, r=10, fill=fill, outline=bd)
    cx = (box[0] + box[2]) / 2
    d.text((cx - tw(d, title, f_bold) / 2, box[1] + 12), title, font=f_bold, fill=tc)
    if sub:
        for i, ln in enumerate(wrap(d, sub, f_tiny, box[2] - box[0] - 20)):
            d.text((cx - tw(d, ln, f_tiny) / 2, box[1] + 34 + i * 15), ln, font=f_tiny, fill=MUTED)


# 主干
top = [('首页', '/'), ('设置\n岗位与权重', '/setup'), ('简历\n上传与确认', '/resume'),
       ('组卷\npreparing', 'composePaper'), ('就绪\nready', '10 题')]
x = 40
tops = []
for i, (t, s) in enumerate(top):
    box = (x, 150, x + 190, 244)
    node(box, t.split('\n')[0], t.split('\n')[1] if '\n' in t else s)
    tops.append(box)
    x += 226
for i in range(len(tops) - 1):
    a, b = tops[i], tops[i + 1]
    arrow(d, a[2] + 10, 197, b[0] - 10, 197)

d.text((40, 268), '会话状态机（idle → preparing → ready → asking …）', font=f_h3, fill=TEXT)

# 循环
loop = (40, 300, 940, 560)
rrect(d, loop, r=14, fill=(250, 251, 252), outline=BORDER)
d.text((60, 312), '面试循环 · 10 题（5 八股 + 5 拷打）', font=f_small, fill=SUB)
steps = [('出题', 'asking'), ('录音', 'answering'), ('转写', 'transcribing'),
         ('评分', 'scoring')]
sx = 60
sboxes = []
for t, s in steps:
    box = (sx, 348, sx + 170, 428)
    node(box, t, s)
    sboxes.append(box)
    sx += 210
for i in range(len(sboxes) - 1):
    arrow(d, sboxes[i][2] + 6, 388, sboxes[i + 1][0] - 6, 388)

# 判定
dia = (300, 456, 620, 536)
d.polygon([((dia[0] + dia[2]) / 2, dia[1]), (dia[2], (dia[1] + dia[3]) / 2),
           ((dia[0] + dia[2]) / 2, dia[3]), (dia[0], (dia[1] + dia[3]) / 2)],
          fill=CARD, outline=BORDER)
d.text((392, 470), '需要追问？', font=f_bold, fill=TEXT)
d.text((386, 492), '≤2 层 / 题', font=f_tiny, fill=MUTED)
arrow(d, 390, 428, 420, 456)
# 否 → 回到出题（下一题）
d.line((470, 536, 470, 550), fill=MUTED, width=2)
d.line((135, 550, 470, 550), fill=MUTED, width=2)
arrow(d, 135, 550, 135, 432, MUTED, 2)
d.text((150, 530), '否 → 下一题（回到出题）', font=f_tiny, fill=MUTED)
arrow(d, 620, 496, 682, 496, MUTED, 2)
rrect(d, (688, 468, 912, 524), r=8, fill=ACCENT_BG, outline=ACCENT_BG)
d.text((700, 476), '是 → 追问 ≤2 层', font=f_tiny, fill=ACCENT)
d.text((700, 498), '回到录音 → 转写 → 评分', font=f_tiny, fill=ACCENT)

# 报告
rep = (940, 300, 1400, 560)
node(rep, '报告', '聚合 → 六维 → 扣分明细 → 疑点 → 导出')
cxr = (tops[4][0] + tops[4][2]) / 2
arrow(d, cxr, 244, cxr, rep[1] - 6)
d.text((cxr + 14, 252), '第 10 题完成', font=f_tiny, fill=MUTED)

# 降级
dg = (40, 590, 1400, 830)
rrect(d, dg, r=14, fill=CARD)
d.text((60, 604), '四条降级分支（任何一条触发都要有出口）', font=f_h3, fill=TEXT)
items = [('D1 ASR 失败', '→ 文字作答', '仍出报告'),
         ('D2 OCR 失败', '→ 手填简历', '仍可拷打'),
         ('D3 LLM 失败', '→ 规则分 + 模板追问', '标注 AI 不可用'),
         ('D4 动作未启用', '→ 权重剔除', '显示「未启用」')]
x = 60
for a, b, c in items:
    rrect(d, (x, 646, x + 320, 760), r=10, fill=(252, 252, 253), outline=BORDER)
    d.text((x + 16, 660), a, font=f_bold, fill=WARN_TX)
    d.text((x + 16, 690), b, font=f_small, fill=TEXT)
    d.text((x + 16, 720), '验收：' + c, font=f_tiny, fill=MUTED)
    x += 336

d.text((60, 782), '中断点：任一步失败 → 显示错误码 + 三个按钮（重试 / 降级 / 跳过），禁止白屏。',
       font=f_small, fill=SUB)

save(img, '00-流程图.png')
print('done ->', OUT)

