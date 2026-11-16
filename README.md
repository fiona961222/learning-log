# 我的學習紀錄

使用純 HTML、CSS、JavaScript 和 Supabase Auth 的繁體中文學習日誌。頁面不需要 npm、React、Vite 或建置工具；Supabase JavaScript 第 2 版由 CDN 載入。

## 設定 Supabase

1. 在 Supabase 建立一個專案。
2. 到專案的 **Project Settings → API**，複製 **Project URL** 和 **publishable key**。只能使用 publishable key；不要放 secret key 或 service_role key。
3. 編輯 `config.js`，把兩個「貼上…」分別換成 Project URL 和 publishable key，保留引號。
4. 在 Supabase 左側選 **SQL Editor → New query**，貼上 `schema.sql` 全文後按 **Run**。這會建立 `learning_logs` 表、啟用 RLS、授予 `authenticated` 角色資料表權限，並用 `auth.uid() = user_id` 政策限制每個帳戶只能讀寫自己的紀錄。新增紀錄時，資料庫會用 `auth.uid()` 自動填入 `user_id`。
5. 在 **Authentication → URL Configuration** 設定網站網址。若以本機靜態伺服器測試，將對應的 localhost 網址加入允許的 Redirect URLs。

## 開啟網站

設定 `config.js` 後，以瀏覽器開啟 `index.html`。註冊時使用 Email 和密碼；若專案啟用了 Email 確認，先依收到的信件完成確認，再登入。若瀏覽器限制直接開啟本機檔案，可使用任何不需建置的靜態檔案伺服器來提供此資料夾。

## 檔案說明

- `index.html`：繁體中文頁面結構與表單。
- `style.css`：桌面與手機版的視覺樣式。
- `app.js`：Supabase 註冊、登入、登出，以及紀錄新增、載入和刪除。
- `config.js`：只包含 Project URL 和 publishable key。
- `schema.sql`：資料表、RLS、角色權限與個人資料政策。
- `README.md`：設定與啟動說明。

頁面顯示使用者提供的文字時以 DOM `textContent` 建立內容，不會把紀錄內容當成 HTML 解讀。
