const puppeteer = require('puppeteer');

async function test() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 监听 console 消息
    page.on('console', msg => {
        console.log('[Browser]', msg.text());
    });
    
    // 监听页面错误
    page.on('pageerror', error => {
        console.log('[Error]', error.message);
    });
    
    // 导航到本地页面
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
    
    console.log('页面已加载，等待设备...');
    
    // 等待用户连接设备后点击按钮
    // 这里可以设置超时或等待特定元素
    
    // 模拟点击有线连接按钮
    await page.waitForSelector('#connect-btn', { timeout: 60000 });
    await page.click('#connect-btn');
    
    console.log('已点击有线连接按钮');
    
    // 等待一段时间让连接过程完成
    await new Promise(r => setTimeout(r, 15000));
    
    // 再次点击连接按钮
    console.log('再次点击有线连接按钮...');
    await page.click('#connect-btn');
    
    await new Promise(r => setTimeout(r, 30000));
    
    await browser.close();
}

test().catch(console.error);
