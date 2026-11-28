"""WhosBill — genera los iconos de la app (ticket blanco con la interrogación de «Who's bill?» sobre fondo índigo).
Uso: python3 whosbill/icons/make-icons.py   (Pillow y la tipografía Inter ExtraBold, licencia OFL)."""
import os
from PIL import Image, ImageDraw, ImageFont
D=os.path.dirname(os.path.abspath(__file__))
FONT='/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf'
TOP,BOT,INK=(118,104,245),(72,52,212),(84,66,232)
def icon(size,maskable=False):
    S=size*4; bg=Image.new('RGB',(S,S),TOP); g=ImageDraw.Draw(bg)
    for y in range(S):  # degradado vertical
        t=y/(S-1); g.line([(0,y),(S,y)],fill=tuple(round(TOP[i]+(BOT[i]-TOP[i])*t) for i in range(3)))
    im=Image.new('RGBA',(S,S),(0,0,0,0)); m=Image.new('L',(S,S),0)
    if maskable: ImageDraw.Draw(m).rectangle([0,0,S,S],fill=255)
    else: ImageDraw.Draw(m).rounded_rectangle([0,0,S-1,S-1],radius=int(S*0.23),fill=255)
    im.paste(bg,(0,0),m); d=ImageDraw.Draw(im)
    k=0.80 if maskable else 1.0   # la zona segura de los iconos «maskable»
    P=lambda x,y:(S/2+(x-0.5)*S*k,S/2+(y-0.5)*S*k)
    x0,x1,y0,y1=0.25,0.75,0.15,0.83; n=5
    pts=[P(x0,y0),P(x1,y0),P(x1,y1)]
    for i in range(n,0,-1):  # borde dentado del ticket
        pts+=[P(x0+(x1-x0)*(i-0.5)/n,y1-0.045),P(x0+(x1-x0)*(i-1)/n,y1)]
    d.polygon(pts,fill=(255,255,255,255))
    f=ImageFont.truetype(FONT,int(S*0.46*k)); cx,cy=P(0.5,0.475)
    d.text((cx,cy),'?',font=f,fill=INK+(255,),anchor='mm')
    return im.resize((size,size),Image.LANCZOS)
for s in (192,512):
    icon(s).save(os.path.join(D,f'icon-{s}.png')); icon(s,True).save(os.path.join(D,f'icon-{s}-maskable.png'))
icon(180,True).convert('RGB').save(os.path.join(D,'apple-touch-icon.png'))
print('iconos ok')
