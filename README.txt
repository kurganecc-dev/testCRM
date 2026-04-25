ANDROMEDA auth patch

1. Добавь файл:
   assets/js/auth-supabase-patch.js

2. В index.html подключи его самым последним скриптом:

   <script src="assets/js/auth-supabase-patch.js"></script>

   Если у тебя подключены модульные JS-файлы, вставь после:
   <script src="assets/js/11-events-init.js"></script>

   Если у тебя подключен bundle, вставь после:
   <script src="assets/dist/app.bundle.js"></script>

3. На сайте вместо выбора профиля появится поле Email.
   Вводить нужно данные из Supabase -> Authentication -> Users.

4. Таблица public.profiles должна содержать строку с id = auth.users.id.
   Минимальные поля:
   id, email, username, display_name, role, department.

5. Пароль в profiles хранить нельзя.
