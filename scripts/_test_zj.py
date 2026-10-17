import sys, traceback
sys.stdout.reconfigure(line_buffering=True)
print('step1: start')
import fitz
print('step2: fitz imported')
doc = fitz.open(r'D:\学习\英语\21天背完《雅思词汇真经》6600个单词！\词汇表List.pdf')
print('step3: doc open, pages =', doc.page_count)
t = doc[0].get_text()
print('step4: page1 len =', len(t))
print('DONE')
