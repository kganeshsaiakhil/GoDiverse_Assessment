# Enhanced Task Manager with Supabase

This project enhances the original Supabase Todo List template with task assignments, due dates, filtering, and real-time notifications.

- Frontend:
  - [Next.js](https://github.com/vercel/next.js) - a React framework for production.
  - [Tailwind](https://tailwindcss.com/) for styling and layout.
  - [Supabase.js](https://supabase.com/docs/library/getting-started) for user management and realtime data syncing.
- Backend:
  - [supabase.com/dashboard](https://supabase.com/dashboard/): hosted Postgres database with restful API for usage with Supabase.js.

## Features

- **User Authentication**: Secure login and registration system
- **Task Management**: Create, read, update, and delete tasks
- **Task Assignment**: Assign tasks to other users
- **Due Date Tracking**: Add due dates to tasks and track overdue items
- **Filtering System**: Filter tasks by:
  - Tasks assigned to me
  - Tasks I created
  - Overdue tasks
  - Tasks due today
- **Real-time Notifications**: Get notified when tasks are assigned to you
- **Real-time Updates**: Changes to tasks are reflected in real-time across all users

## Setup Instructions

### 1. Create new Supabase project

Sign up to Supabase - [https://supabase.com/dashboard](https://supabase.com/dashboard) and create a new project. Wait for your database to start.

### 2. Set up the database schema

Once your database has started, go to the SQL editor and run the SQL scripts from the `supabase/migrations` folder in order:
1. First run `20230712094349_init.sql` to set up the initial schema
2. Then run `20250606000000_add_task_assignments.sql` to add the new features

### 3. Get the URL and Keys

Go to the Project Settings (the cog icon), open the API tab, and find your:
- API URL 
- `anon` key
- `service_role` key (needed for the user listing functionality)

### 4. Set up environment variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Get these from your Supabase project: https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Required for user listing
NEXT_SITE_URL=http://localhost:3000
NEXT_REDIRECT_URLS=http://localhost:3000/
```

### 5. Install dependencies and run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Live Demo

You can try the deployed application here: [go-diverse-assessment.vercel.app](https://go-diverse-assessment.vercel.app/)

## Database Schema

The application uses the following database tables:

1. **todos** - Stores task information
   - `id` - BIGINT PRIMARY KEY (auto-generated identity)
   - `user_id` - UUID (references auth.users, not null)
   - `task` - TEXT (minimum length of 4 characters)
   - `is_complete` - BOOLEAN (default false)
   - `inserted_at` - TIMESTAMP WITH TIME ZONE (default current UTC time)
   - `assigned_to` - UUID (references auth.users, nullable)
   - `due_date` - TIMESTAMP WITH TIME ZONE (nullable)
   - `created_by` - UUID (references auth.users, default is current user)

2. **notifications** - Stores user notifications
   - `id` - BIGINT PRIMARY KEY (auto-generated identity)
   - `user_id` - UUID (references auth.users, not null)
   - `task_id` - BIGINT (references todos.id with cascade delete)
   - `message` - TEXT (not null)
   - `is_read` - BOOLEAN (default false)
   - `created_at` - TIMESTAMP WITH TIME ZONE (default current UTC time)

## Security

This application uses Supabase's Row Level Security (RLS) to ensure secure data access:

### Todo Policies:

1. **Create**: Users can create todos and set assignments if they are the creator
   ```sql
   CREATE POLICY "Individuals can create todos and set assignments" ON todos
     FOR INSERT WITH CHECK (auth.uid() = created_by);
   ```

2. **Read**: Users can view todos they created or are assigned to
   ```sql
   CREATE POLICY "Users can view todos they created or are assigned to" ON todos
     FOR SELECT USING (auth.uid() = created_by OR auth.uid() = assigned_to);
   ```

3. **Update**: Users can update todos they created or are assigned to
   ```sql
   CREATE POLICY "Users can update todos they created or are assigned to" ON todos
     FOR UPDATE USING (auth.uid() = created_by OR auth.uid() = assigned_to);
   ```

4. **Delete**: Users can only delete todos they created
   ```sql
   CREATE POLICY "Individuals can delete their own todos." ON todos
     FOR DELETE USING (auth.uid() = user_id);
   ```

### Notification Policies:

1. **Read**: Users can only view their own notifications
   ```sql
   CREATE POLICY "Individuals can view their own notifications" ON notifications
     FOR SELECT USING (auth.uid() = user_id);
   ```

2. **Update**: Users can only update their own notifications (e.g., mark as read)
   ```sql
   CREATE POLICY "Individuals can update their own notifications" ON notifications
     FOR UPDATE USING (auth.uid() = user_id);
   ```

## Using the Application

1. **Authentication**:
   - Register or log in using Supabase authentication
   - Your user information is securely stored in Supabase Auth

2. **Creating Tasks**:
   - Enter a task description in the input field
   - Optionally select a user to assign the task to from the dropdown
   - Optionally set a due date using the date picker
   - Click "Add Task" to create the task

3. **Managing Tasks**:
   - Tasks are displayed in a list with their status, assignment, and due date
   - Toggle the checkbox to mark a task as complete/incomplete
   - Click the expand button (plus icon) to reveal additional options
   - Assign/reassign the task to another user using the dropdown
   - Change the due date using the date picker
   - Delete a task by clicking the trash icon

4. **Filtering Tasks**:
   - Use the filter buttons to view different categories of tasks:
     - **All Tasks**: Shows all tasks you created or are assigned to you
     - **Assigned to Me**: Shows only tasks assigned to you
     - **Created by Me**: Shows only tasks you created
     - **Overdue**: Shows incomplete tasks with due dates in the past
     - **Due Today**: Shows incomplete tasks due on the current day

5. **Notifications**:
   - When someone assigns a task to you, you'll receive a notification
   - The bell icon in the header shows the number of unread notifications
   - Click the bell icon to view and manage your notifications
   - Notifications are automatically marked as read when viewed

6. **Visual Indicators**:
   - Overdue tasks have a red border on the left
   - Tasks due today have a yellow border on the left
   - Completed tasks have their text struck through

## Original Supabase Todo Example Documentation

### Deploy with Vercel

The Vercel deployment will guide you through creating a Supabase account and project. After installation of the Supabase integration, all relevant environment variables will be set up so that the project is usable immediately after deployment 🚀

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsupabase%2Fsupabase%2Ftree%2Fmaster%2Fexamples%2Ftodo-list%2Fnextjs-todo-list&project-name=supabase-nextjs-todo-list&repository-name=supabase-nextjs-todo-list&integration-ids=oac_VqOgBHqhEoFTPzGkPd7L0iH6&external-id=https%3A%2F%2Fgithub.com%2Fsupabase%2Fsupabase%2Ftree%2Fmaster%2Fexamples%2Ftodo-list%2Fnextjs-todo-list)

### Postgres Row level security

This project uses very high-level Authorization using Postgres' Row Level Security.
When you start a Postgres database on Supabase, we populate it with an `auth` schema, and some helper functions.
When a user logs in, they are issued a JWT with the role `authenticated` and their UUID.
We can use these details to provide fine-grained control over what each user can and cannot do.

## Error Handling and Edge Cases

The application includes robust handling for various scenarios:

1. **User Assignment**:
   - If a user is deleted from the system, any tasks assigned to them will be handled gracefully
   - The application prevents foreign key constraint violations by validating assignments
   - Tasks can always be reassigned even if the original assignee no longer exists

2. **Service Role Key**:
   - The application requires the `SUPABASE_SERVICE_ROLE_KEY` for user listing functionality
   - If this key is not available, the user selector will display appropriate messages
   - Tasks can still be created and managed without this key, but assignment options will be limited

3. **Due Date Handling**:
   - Tasks with past due dates are visually marked as overdue
   - The filtering system allows users to quickly identify overdue or due today tasks
   - Due dates can be modified or removed at any time

4. **Notifications**:
   - Notifications are automatically deleted when the associated task is deleted (cascade delete)
   - Users only see notifications relevant to them (enforced by RLS)
   - Real-time updates ensure notifications appear instantly when tasks are assigned

## Authors

- Original Template: [Supabase](https://supabase.com)
- Enhancements: Akhil Kompella
