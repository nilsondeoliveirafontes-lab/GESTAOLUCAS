
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vkdoommccibddhzkynzj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZG9vbW1jY2liZGRoemt5bnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTc5MDIsImV4cCI6MjA4MTU3MzkwMn0.uU--JS8WYPjS9zdn-cIa-KPqLE11A3M3BzQSsXn9xnQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
