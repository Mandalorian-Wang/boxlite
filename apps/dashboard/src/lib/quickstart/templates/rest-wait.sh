# Wait for the task before the EXIT trap removes its Box.
deadline=$((SECONDS + 900))
while [ "$SECONDS" -lt "$deadline" ]; do
  status="$(curl -fsS --connect-timeout 5 --max-time 15 \
    "${BOXLITE_REST_URL}/v1/boxes/${box_id}/executions/${exec_id}" "${auth[@]}")"
  case "$(printf '%s' "$status" | jq -r '.status')" in
    completed|killed|timed_out)
      printf '%s\n' "$status" | jq
      exit_code="$(printf '%s' "$status" | jq -r '.exit_code // 1')"
      if [[ "$exit_code" =~ ^[0-9]+$ ]] && [ "$exit_code" -le 255 ]; then
        exit "$exit_code"
      fi
      exit 1
      ;;
  esac
  sleep 1
done
printf 'Execution did not finish within 15 minutes. Cleaning up the Box.\n' >&2
exit 124
