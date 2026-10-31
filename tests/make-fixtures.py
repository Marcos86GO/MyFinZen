"""Genera PDFs y CSVs de prueba con datos INVENTADOS (nunca uses datos reales: el repo es público).
Uso: python3 tests/make-fixtures.py   (requiere: pip install reportlab)"""
import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
D=os.path.join(os.path.dirname(__file__),'fixtures'); os.makedirs(D,exist_ok=True)
def mk(fn,lines):
    c=canvas.Canvas(os.path.join(D,fn),pagesize=letter); y=750
    for l in lines: c.drawString(40,y,l); y-=16
    c.save()
mk('mortgage.pdf',["Pennymac Mortgage Activity Statement","Statement Date: October 6, 2026","Loan Number: 0000001234","Payment Due Date: November 1, 2026",
 "Principal: $1,000.00","Interest: $3,500.00","Escrow (Taxes and Insurance): $0.00","Regular Monthly Payment: $4,500.00",
 "Unpaid Principal Balance: $800,000.00","Interest Rate: 5.250%","Property Tax Bills: informational text","10/01/2026 Principal Reduction $200.00"])
mk('bank.pdf',["Test Bank Checking","Statement Period: September 13, 2026 through October 12, 2026","Account Number: 000000123456789",
 "Beginning Balance $10,000.00","Ending Balance $12,000.00","DEPOSITS AND ADDITIONS","10/01 ACME CORP PAYROLL PPD ID: 1234567890 8,000.00",
 "10/03 Zelle Payment From Tenant Rent 3,000.00","ELECTRONIC WITHDRAWALS","10/01 PENNYMAC LOAN PAYMENT 4,700.00","10/05 FIRSTSERVICE RESIDENTIAL HOA 300.00","09/28 COSTCO WHSE #0453 400.00"])
mk('w2.pdf',["Form W-2 Wage and Tax Statement 2026","1 Wages, tips, other compensation","150,000.00","2 Federal income tax withheld","20,000.00",
 "12a D 24,500.00","14 Other CASDI 1,950.00","16 State wages, tips, etc.","150,000.00","17 State income tax","9,000.00"])
mk('1098.pdf',["Form 1098 Mortgage Interest Statement 2026","Test Lender","1 Mortgage interest received from payer(s)/borrower(s)","$42,000.00","2 Outstanding mortgage principal","$810,000.00"])
mk('c1099.pdf',["Test Broker","Consolidated Form 1099 Tax Year 2026","1 Interest income 10.00","1a Total ordinary dividends 1,000.00","1b Qualified dividends 900.00",
 "2a Total capital gain distr. 50.00","Short-term gain or loss 100.00","Long-term gain or loss 500.00"])
open(os.path.join(D,'Holdings-Oct-30-2026.csv'),'w').write('''Symbol,Name,Quantity,Avg. Price,Cost Basis,Unrealized Gain ($),Unrealized Gain (%),Value
VOO,Vanguard S&P 500 ETF,10,400.00,"4,000.00","1,500.00",37.5,"5,500.00"
VXUS,Vanguard Total International Stock ETF,50,60.00,"3,000.00",-200.00,-6.67,"2,800.00"
NFLX,Netflix,5,100.00,500.00,250.00,50,750.00
''')
open(os.path.join(D,'card.csv'),'w').write('''Transaction Date,Post Date,Description,Category,Type,Amount
10/02/2026,10/03/2026,COSTCO WHSE #0123,Groceries,Sale,-312.45
10/05/2026,10/06/2026,SHELL OIL 5744,Gas,Sale,-58.10
10/12/2026,10/12/2026,PAYMENT THANK YOU,,Payment,1500.00
''')
print('fixtures ok')
