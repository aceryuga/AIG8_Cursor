# Delete User Edge Function

This Supabase Edge Function handles the deletion of auth users, which requires admin privileges.

## Purpose

When a user deletes their account from the application:
1. The application deletes all user data from `public` schema tables
2. The application deletes all storage files
3. The application calls this Edge Function to delete the auth user
4. This function uses the service role key to delete from `auth.users`

## Security

- ✅ Requires valid authentication token
- ✅ Users can only delete their own account
- ✅ Uses service role key safely on server-side

## Deployment

Deploy this function using the Supabase CLI:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref rgehlcjvbuxsefkebaof

# Deploy the function
supabase functions deploy delete-user
```

## Environment Variables

This function requires the following environment variables (automatically available):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key for auth verification
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations

## Usage from Client

```typescript
const { data, error } = await supabase.functions.invoke('delete-user', {
  body: { userId: user.id }
});

if (error) {
  console.error('Failed to delete auth user:', error);
} else {
  console.log('Auth user deleted successfully');
}
```

## Testing

Test the function locally:

```bash
supabase functions serve delete-user
```

Then call it:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/delete-user' \
  --header 'Authorization: Bearer YOUR_USER_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"userId":"USER_ID_HERE"}'
```

## Response Format

### Success (200)
```json
{
  "success": true,
  "message": "User deleted successfully",
  "userId": "83b5c1e3-5816-4546-b2b1-c8d3e58e33fa"
}
```

### Error (400)
```json
{
  "success": false,
  "error": "Unauthorized: You can only delete your own account"
}
```

