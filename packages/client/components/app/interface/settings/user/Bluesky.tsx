import { Trans } from "@lingui-solid/solid/macro";

import { useModals } from "@revolt/modal";
import { useNavigate } from "@revolt/routing";
import {
  CategoryButton,
  CategoryButtonGroup,
  Column,
  iconSize,
} from "@revolt/ui";

import MdCloud from "@material-design-icons/svg/outlined/cloud.svg?component-solid";

/**
 * Bluesky settings section (replaces the old "Feedback" section).
 *
 * The user is authenticated with Cooey SSO, so opening their Bluesky brokers an
 * atproto session and signs them straight into their `<handle>.cooey.club`
 * account — no second login. Same destination as the "Open your Bluesky" button
 * on the home screen: the in-app `/bluesky` view.
 */
export function Bluesky() {
  const { pop } = useModals();
  const navigate = useNavigate();

  return (
    <Column gap="lg">
      <CategoryButtonGroup>
        <CategoryButton
          onClick={() => {
            pop();
            navigate("/bluesky");
          }}
          icon={<MdCloud {...iconSize(22)} />}
          description={
            <Trans>See your Bluesky feed — you're signed in automatically.</Trans>
          }
        >
          <Trans>Open your Bluesky</Trans>
        </CategoryButton>
      </CategoryButtonGroup>
    </Column>
  );
}
