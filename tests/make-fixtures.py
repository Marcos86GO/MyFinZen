"""Genera PDFs y CSVs de prueba con datos INVENTADOS (nunca uses datos reales: el repo es público).
Uso: python3 tests/make-fixtures.py   (requiere: pip install reportlab)"""
import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
D=os.path.join(os.path.dirname(__file__),'fixtures'); os.makedirs(D,exist_ok=True)
def mk(fn,lines):
    c=canvas.Canvas(os.path.join(D,fn),pagesize=letter); y=750
    for l in lines:
        if l=='<PAGE>' or y<50: c.showPage(); y=750
        if l=='<PAGE>': continue
        c.drawString(40,y,l); y-=16
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
# ---- Extractos con la estructura de entidades reales (Bank of America, M1, Empower, Wells Fargo).
# Todo inventado: nombres, direcciones, números de cuenta e importes. Imitan solo cómo sale el texto con pdf.js.
mk('bofa_card_aug.pdf',["Customer Service Information:","www.bankofamerica.com","Mail payment to:","Bank of America","JANE Q SAMPLE","100 EXAMPLE AVE",
 "Visa Signature®","Account# 4111 0000 0000 4321","July 5 - August 4, 2026","New Balance Total $ 2,000.00","Account Summary/Payment Information",
 "Previous Balance $ 0.00","Payments and Other Credits -$ 0.00","Purchases and Adjustments $ 2,000.00","Payment Due Date 08/31/2026","Statement Closing Date 08/04/2026",
 "Transactions","Date Date Description Number Number Amount Total","Purchases and Adjustments","07/20 07/21 EXAMPLE FURNITURE STORE ANYTOWN CA 1234 4321 2,000.00",
 "TOTAL PURCHASES AND ADJUSTMENTS FOR THIS PERIOD $ 2,000.00"])
mk('bofa_card_sep.pdf',["Customer Service Information:","www.bankofamerica.com","Mail payment to:","Bank of America","JANE Q SAMPLE","100 EXAMPLE AVE",
 "Visa Signature®","Account# 4111 0000 0000 4321","August 5 - September 4, 2026","New Balance Total $ 1,250.00","Account Summary/Payment Information",
 "Previous Balance $ 2,000.00","Payments and Other Credits -$ 2,000.00","Purchases and Adjustments $ 1,250.00","Payment Due Date 10/01/2026","Statement Closing Date 09/04/2026",
 "Transactions","Date Date Description Number Number Amount Total","Payments and Other Credits","08/20 08/20 PAYMENT FROM CHK 9876 CONF#ab12cd 5678 4321","- 2,000.00",
 "TOTAL PAYMENTS AND OTHER CREDITS FOR THIS PERIOD - $ 2,000.00","Purchases and Adjustments","08/03 08/06 TRADER JOES #123 ANYTOWN CA 2222 4321 250.00",
 "08/10 08/11 COSTCO WHSE #0001 ANYTOWN CA 3333 4321 1,000.00","TOTAL PURCHASES AND ADJUSTMENTS FOR THIS PERIOD $ 1,250.00"])
mk('bofa_checking.pdf',["Customer service information","bankofamerica.com","JANE Q SAMPLE","Your Adv Relationship Banking","BofA Rewards Preferred Plus",
 "for August 15, 2026 to September 14, 2026 Account number: 0000 1111 9876","Account summary","Beginning balance on August 15, 2026 $5,000.00",
 "Deposits and other additions 6,000.00","Other subtractions -6,500.00","Ending balance on September 14, 2026 $4,500.00",
 "Merrill Edge self-directed investing and IRA accounts: ask us about retirement","Deposits and other additions","Date Description Amount",
 "09/01/26 ACME CORP DES:PAYROLL ID:000111 INDN:SAMPLE JANE CO ID:999 PPD 6,000.00","Total deposits and other additions $6,000.00",
 "Withdrawals and other subtractions","Other subtractions","Date Description Amount","08/20/26 BANK OF AMERICA CREDIT CARD Bill Payment -2,000.00",
 "09/01/26 WELLS FARGO HOME MTG DES:AUTO PAY ID:000 INDN:SAMPLE JANE -3,000.00","09/05/26 Online Banking transfer to SAV 5555 Confirmation# 123 -1,500.00",
 "Total other subtractions -$6,500.00"])
mk('bofa_savings.pdf',["Customer service information","bankofamerica.com","JANE Q SAMPLE","Your Bank of America Advantage Savings",
 "for August 15, 2026 to September 14, 2026 Account number: 0000 2222 5555","Account summary","Beginning balance on August 15, 2026 $10,000.00",
 "Deposits and other additions 1,502.00","Withdrawals and other subtractions -0.00","Ending balance on September 14, 2026 $11,502.00",
 "Deposits and other additions","Date Description Amount","09/05/26 Online Banking transfer from CHK 9876 Confirmation# 123 1,500.00","09/14/26 Interest Earned 2.00",
 "Total deposits and other additions $1,502.00"])
mk('m1_cash.pdf',["Statement","Sophisticated wealth building, simplified.","123 Test St, Chicago, IL 00000 Statement period: 09/01/2026 to 09/30/2026",
 "Account number: XXXXXXX7777","Account: M1 Cash Account","Activity summary","Opening balance $20,000.00","Interest $50.00 $300.00","Withdrawals $(100.00) $(500.00)",
 "Closing balance $19,950.00","M1: The Finance Super App® Page 1 of 2","Activity Activity","Date Description Amount Date Description Amount",
 "2026-09-10 Instant transfer to M1 Invest $(100.00) 2026-09-30 Interest application $50.00"])
mk('empower_q3.pdf',["Empower","EXAMPLE CORP 401(K) PLAN","JANE Q SAMPLE Statement Period: 07/01/2026 - 09/30/2026","Plan: 000000-01",
 "Employee Employer Total","Balance as of June 30, 2026 $90,000.00 $10,000.00 $100,000.00","Payroll Contributions 5,000.00 1,000.00 6,000.00",
 "Balance as of September 30, 2026 $97,000.00 $11,500.00 $108,500.00",
 "How will my future contributions be invested?","60% Large Cap Funds","60% Vanguard 500 Index Admiral","30% International Funds","30% Vanguard Developed Markets Index Admiral","10% Bond Funds","10% Vanguard Total Bond Market Index Admiral",
 "How is my account invested?","60.00% Large Cap Funds","30.00% International Funds","10.00% Bond Funds","Ending","Beginning Change Withdrawals Ending Units/","Balance Deposits in Value Transfers /Expenses Balance Shares",
 "Large Cap Funds","Vanguard 500 Index 60,000.00 3,600.00 1,560.00 -60.00 65,100.00 120.556","Admiral",
 "International Funds","Vanguard Developed 30,000.00 1,800.00 780.00 -30.00 32,550.00 1,800.250","Markets Index Admiral","ADDR-Y 0000000000 Page 1 of 2","<PAGE>",
 "EXAMPLE CORP 401(K) PLAN","JANE Q SAMPLE","12345678","How is my account invested? (continued)","Ending","Beginning Change Withdrawals Ending Units/","Balance Deposits in Value Transfers /Expenses Balance Shares",
 "Bond Funds","Vanguard Total Bond 10,000.00 600.00 280.00 -30.00 10,850.00 1,000.000","Market Index Admiral",
 "Totals 100,000.00 6,000.00 2,620.00 -120.00 108,500.00","How is my account being funded?","Employee 90,000.00 5,000.00 2,000.00 97,000.00"])
mk('wf_mortgage.pdf',["Wells Fargo Home Mortgage","Statement date 10/09/26","Loan number 0000005678","Payment due date 11/01/26","Total amount due $3,000.00",
 "Explanation of amount due Balance summary Past payments breakdown","Principal $500.00 Unpaid principal balance $400,000.00 Since last statement Year-to-date",
 "Interest $2,000.00 Call Customer Service for a payoff amount","Escrow $500.00 Principal $500.00 $4,000.00",
 "Current payment $3,000.00 Account information Interest** $2,000.00 $16,000.00","Total amount due 11/01/26 $3,000.00 Interest rate 6.000% Escrow $500.00 $4,000.00",
 "make a full monthly payment, as outlined in your mortgage note.","wellsfargo.com"])
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
# Cuenta corriente: cuota de hipoteca adelantada (dos en septiembre, ninguna en octubre), pago de la tarjeta
# de card.csv sin palabras clave, transferencia a ahorro y un pago a otra tarjeta que no está importada.
open(os.path.join(D,'checking.csv'),'w').write('''Posting Date,Description,Amount
09/01/2026,PENNYMAC LOAN PAYMENT,-4700.00
09/15/2026,ACME CORP PAYROLL,8000.00
09/30/2026,PENNYMAC LOAN PAYMENT,-4700.00
10/11/2026,CHASE CARDMEMBER SVC,-1500.00
10/15/2026,ACME CORP PAYROLL,8000.00
10/20/2026,ONLINE TRANSFER TO SAV,-2000.00
10/22/2026,AMEX EPAYMENT ACH PMT,-900.00
''')
open(os.path.join(D,'savings.csv'),'w').write('''Posting Date,Description,Amount
10/21/2026,ONLINE TRANSFER FROM CHK,2000.00
''')
print('fixtures ok')
