from django.core.management.base import BaseCommand
from django.utils.timezone import now
from community.models import Challenge, ChallengeEntry
from users.models import UserProfile
from django.db.models import Count

class Command(BaseCommand):
    help = "Expire ended challenges and assign winners based on most upvotes"

    def handle(self, *args, **kwargs):
        current_time = now()
        expired_challenges = Challenge.objects.filter(is_active=True, end_date__lt=current_time)

        if not expired_challenges.exists():
            self.stdout.write("✅ No challenges to expire.")
            return

        for challenge in expired_challenges:
            self.stdout.write(f"🔒 Expiring challenge: {challenge.title}")

            # Mark as inactive
            challenge.is_active = False
            challenge.save()

            # Get entries ordered by vote count
            top_entry = (
                ChallengeEntry.objects
                .filter(challenge=challenge)
                .annotate(upvote_count=Count('votes'))
                .order_by('-upvote_count')
                .first()
            )

            if top_entry:
                user_profile = UserProfile.objects.get(user=top_entry.user)
                user_profile.challenges_won += 1
                user_profile.save()
                self.stdout.write(f"🏆 Winner: {top_entry.user.username} (Votes: {top_entry.votes.count()})")
            else:
                self.stdout.write("⚠️ No entries found for this challenge.")

        self.stdout.write("🎯 Challenge expiration and winner assignment complete.")
