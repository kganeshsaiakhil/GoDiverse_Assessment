import { Database } from './schema'
import { SupabaseClient } from '@supabase/supabase-js'

export const createTaskAssignmentNotification = async (
  supabase: SupabaseClient<Database>,
  taskId: number,
  assigneeId: string,
  taskTitle: string,
  assignerEmail: string
) => {
  try {
    const message = `${assignerEmail} assigned you a task: "${taskTitle}"`
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: assigneeId,
        task_id: taskId,
        message,
        is_read: false
      })
    
    if (error) {
      console.error('Error creating notification:', error)
    }
  } catch (error) {
    console.error('Error creating notification:', error)
  }
}

export const markNotificationAsRead = async (
  supabase: SupabaseClient<Database>,
  notificationId: number
) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
    
    if (error) {
      console.error('Error marking notification as read:', error)
    }
  } catch (error) {
    console.error('Error marking notification as read:', error)
  }
}

export const markAllNotificationsAsRead = async (
  supabase: SupabaseClient<Database>,
  userId: string
) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    
    if (error) {
      console.error('Error marking all notifications as read:', error)
    }
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
  }
}
