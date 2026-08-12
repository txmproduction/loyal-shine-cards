CREATE TABLE public.apple_pass_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_library_identifier text NOT NULL,
  pass_type_identifier text NOT NULL,
  serial_number text NOT NULL,
  push_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_library_identifier, pass_type_identifier, serial_number)
);
CREATE INDEX apple_pass_registrations_serial_idx ON public.apple_pass_registrations (serial_number);
GRANT ALL ON public.apple_pass_registrations TO service_role;
ALTER TABLE public.apple_pass_registrations ENABLE ROW LEVEL SECURITY;