{{API_KEY_SH}}
export BOXLITE_REST_URL="{{REST_API_URL}}"
box_name="sdk-quickstart-cli-$(date +%s)"

boxlite create --name "$box_name" ghcr.io/boxlite-ai/boxlite-agent-base:v0.1.0
boxlite start "$box_name"

boxlite exec "$box_name" -- {{SHELL_COMMAND}}
boxlite rm -f "$box_name"
